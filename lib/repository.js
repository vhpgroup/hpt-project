import { randomUUID } from "node:crypto";
import { getDb } from "./db.js";
import { ApiError, completionRate, deriveStatus } from "./domain.js";

const nowIso = () => new Date().toISOString();

/* ------------------------------------------------------------------ items */

function mapItem(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name ?? null,
    owner: row.owner ?? null,
    location: row.location ?? null,
    bid: row.bid ?? null,
    orderNo: row.order_no,
    name: row.name,
    unit: row.unit,
    planQty: row.plan_qty,
    receivedQty: row.received_qty,
    receivedDate: row.received_date,
    model: row.model,
    maker: row.maker,
    note: row.note,
    status: deriveStatus(row.plan_qty, row.received_qty),
    completion: completionRate(row.plan_qty, row.received_qty),
    updatedAt: row.updated_at,
  };
}

const ITEM_SELECT = `
  SELECT i.*, p.name AS project_name, p.owner, p.location, p.bid
  FROM items i JOIN projects p ON p.id = i.project_id
`;

/**
 * Lọc + phân trang phía server. Trạng thái là giá trị suy ra nên được tính
 * bằng CASE trong SQL để có thể lọc mà không phải tải toàn bộ bảng về.
 */
const STATUS_SQL = `
  CASE
    WHEN i.received_qty IS NULL THEN 'Chưa cập nhật'
    WHEN i.plan_qty > 0 AND i.received_qty >= i.plan_qty THEN 'Hoàn thành'
    WHEN i.received_qty <= 0 THEN 'Chưa nhập'
    ELSE 'Đang nhập'
  END
`;

export function listItems({ q, projectId, owner, status, page = 1, pageSize = 10 } = {}) {
  const where = [];
  const params = [];

  if (q) {
    where.push("(i.name LIKE ? OR i.model LIKE ? OR i.maker LIKE ? OR p.name LIKE ?)");
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (projectId) { where.push("i.project_id = ?"); params.push(projectId); }
  if (owner)     { where.push("p.owner = ?");      params.push(owner); }
  if (status)    { where.push(`${STATUS_SQL} = ?`); params.push(status); }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const db = getDb();

  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM items i JOIN projects p ON p.id = i.project_id ${whereSql}`)
    .get(...params);

  const safePageSize = Math.min(Math.max(Number(pageSize) || 10, 1), 200);
  const pageCount = Math.max(Math.ceil(total / safePageSize), 1);
  const safePage = Math.min(Math.max(Number(page) || 1, 1), pageCount);
  const offset = (safePage - 1) * safePageSize;

  const rows = db
    .prepare(`${ITEM_SELECT} ${whereSql} ORDER BY p.name, CAST(i.order_no AS INTEGER), i.name LIMIT ? OFFSET ?`)
    .all(...params, safePageSize, offset);

  return {
    data: rows.map(mapItem),
    meta: { total, page: safePage, pageSize: safePageSize, pageCount },
  };
}

export function getItem(id) {
  const row = getDb().prepare(`${ITEM_SELECT} WHERE i.id = ?`).get(id);
  if (!row) throw new ApiError(404, "Không tìm thấy hàng hóa.");
  return mapItem(row);
}

export function createItem(data) {
  const db = getDb();
  assertProjectExists(data.projectId);

  const id = randomUUID();
  const ts = nowIso();
  db.prepare(
    `INSERT INTO items (id, project_id, order_no, name, unit, plan_qty, received_qty,
                        received_date, model, maker, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, data.projectId, data.orderNo ?? "", data.name, data.unit ?? "",
    data.planQty ?? 0, data.receivedQty ?? null, data.receivedDate ?? null,
    data.model ?? "", data.maker ?? "", data.note ?? "", ts, ts
  );
  return getItem(id);
}

export function updateItem(id, patch) {
  const db = getDb();
  getItem(id); // 404 nếu không tồn tại
  if (patch.projectId) assertProjectExists(patch.projectId);

  const columns = {
    projectId: "project_id", orderNo: "order_no", name: "name", unit: "unit",
    planQty: "plan_qty", receivedQty: "received_qty", receivedDate: "received_date",
    model: "model", maker: "maker", note: "note",
  };
  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(columns)) {
    if (patch[key] === undefined) continue;
    sets.push(`${column} = ?`);
    params.push(patch[key]);
  }
  if (sets.length) {
    sets.push("updated_at = ?");
    params.push(nowIso(), id);
    db.prepare(`UPDATE items SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  }
  return getItem(id);
}

export function deleteItem(id) {
  const info = getDb().prepare("DELETE FROM items WHERE id = ?").run(id);
  if (info.changes === 0) throw new ApiError(404, "Không tìm thấy hàng hóa.");
}

/* --------------------------------------------------------------- projects */

function mapProject(row) {
  const planQty = row.plan_qty ?? 0;
  const receivedQty = row.received_qty ?? 0;
  return {
    id: row.id,
    name: row.name,
    owner: row.owner,
    bid: row.bid,
    location: row.location,
    itemCount: row.item_count ?? 0,
    planQty,
    receivedQty,
    completion: completionRate(planQty, receivedQty),
    done: row.done ?? 0,
    inProgress: row.in_progress ?? 0,
    notStarted: row.not_started ?? 0,
    stale: row.stale ?? 0,
    updatedAt: row.last_update ?? row.updated_at,
  };
}

const PROJECT_SELECT = `
  SELECT p.*,
    COUNT(i.id) AS item_count,
    COALESCE(SUM(i.plan_qty), 0) AS plan_qty,
    COALESCE(SUM(COALESCE(i.received_qty, 0)), 0) AS received_qty,
    SUM(CASE WHEN i.received_qty IS NOT NULL AND i.plan_qty > 0 AND i.received_qty >= i.plan_qty THEN 1 ELSE 0 END) AS done,
    SUM(CASE WHEN i.received_qty > 0 AND i.received_qty < i.plan_qty THEN 1 ELSE 0 END) AS in_progress,
    SUM(CASE WHEN i.received_qty = 0 THEN 1 ELSE 0 END) AS not_started,
    SUM(CASE WHEN i.received_qty IS NULL THEN 1 ELSE 0 END) AS stale,
    MAX(i.received_date) AS last_update
  FROM projects p LEFT JOIN items i ON i.project_id = p.id
`;

export function listProjects({ q, owner, page = 1, pageSize = 10 } = {}) {
  const where = [];
  const params = [];
  if (q)     { where.push("(p.name LIKE ? OR p.bid LIKE ? OR p.location LIKE ?)"); const l = `%${q}%`; params.push(l, l, l); }
  if (owner) { where.push("p.owner = ?"); params.push(owner); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const db = getDb();
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM projects p ${whereSql}`).get(...params);

  const safePageSize = Math.min(Math.max(Number(pageSize) || 10, 1), 200);
  const pageCount = Math.max(Math.ceil(total / safePageSize), 1);
  const safePage = Math.min(Math.max(Number(page) || 1, 1), pageCount);

  const rows = db
    .prepare(`${PROJECT_SELECT} ${whereSql} GROUP BY p.id ORDER BY p.name LIMIT ? OFFSET ?`)
    .all(...params, safePageSize, (safePage - 1) * safePageSize);

  return {
    data: rows.map(mapProject),
    meta: { total, page: safePage, pageSize: safePageSize, pageCount },
  };
}

export function getProject(id) {
  const row = getDb().prepare(`${PROJECT_SELECT} WHERE p.id = ? GROUP BY p.id`).get(id);
  if (!row) throw new ApiError(404, "Không tìm thấy dự án.");
  return mapProject(row);
}

export function createProject(data) {
  const id = randomUUID();
  const ts = nowIso();
  try {
    getDb()
      .prepare(
        `INSERT INTO projects (id, name, owner, bid, location, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, data.name, data.owner ?? "", data.bid ?? "", data.location ?? "", ts, ts);
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      throw new ApiError(409, "Dự án trùng tên đã tồn tại.", { name: "Tên dự án đã tồn tại." });
    }
    throw err;
  }
  return getProject(id);
}

export function updateProject(id, patch) {
  getProject(id);
  const columns = { name: "name", owner: "owner", bid: "bid", location: "location" };
  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(columns)) {
    if (patch[key] === undefined) continue;
    sets.push(`${column} = ?`);
    params.push(patch[key]);
  }
  if (sets.length) {
    sets.push("updated_at = ?");
    params.push(nowIso(), id);
    try {
      getDb().prepare(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    } catch (err) {
      if (String(err.message).includes("UNIQUE")) {
        throw new ApiError(409, "Dự án trùng tên đã tồn tại.", { name: "Tên dự án đã tồn tại." });
      }
      throw err;
    }
  }
  return getProject(id);
}

/** Xoá dự án sẽ xoá theo toàn bộ hàng hóa của nó (ON DELETE CASCADE). */
export function deleteProject(id) {
  const info = getDb().prepare("DELETE FROM projects WHERE id = ?").run(id);
  if (info.changes === 0) throw new ApiError(404, "Không tìm thấy dự án.");
}

function assertProjectExists(projectId) {
  const row = getDb().prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
  if (!row) throw new ApiError(422, "Dự án không tồn tại.", { projectId: "Dự án không tồn tại." });
}

/* ------------------------------------------------------------------ stats */

export function getStats() {
  const db = getDb();

  const totals = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM projects) AS projectCount,
         COUNT(*) AS itemCount,
         COALESCE(SUM(plan_qty), 0) AS planQty,
         COALESCE(SUM(COALESCE(received_qty, 0)), 0) AS receivedQty
       FROM items`
    )
    .get();

  const byStatus = db
    .prepare(`SELECT ${STATUS_SQL} AS status, COUNT(*) AS count FROM items i GROUP BY status`)
    .all();

  const statusMap = Object.fromEntries(byStatus.map((r) => [r.status, r.count]));

  // "Cần chú ý": dự án còn nhiều dòng chưa xong nhất, ưu tiên dòng chưa cập nhật.
  const attention = db
    .prepare(
      `${PROJECT_SELECT}
       GROUP BY p.id
       HAVING item_count > 0 AND (not_started + stale + in_progress) > 0
       ORDER BY (stale * 2 + not_started) DESC, in_progress DESC
       LIMIT 5`
    )
    .all()
    .map(mapProject);

  return {
    ...totals,
    completion: completionRate(totals.planQty, totals.receivedQty),
    byStatus: statusMap,
    attention,
  };
}

/** Toàn bộ dòng hàng phục vụ xuất CSV — không phân trang. */
export function listAllItemsForExport(filters = {}) {
  return listItems({ ...filters, page: 1, pageSize: 100000 }).data;
}

export function listOwners() {
  return getDb()
    .prepare("SELECT DISTINCT owner FROM projects WHERE owner <> '' ORDER BY owner")
    .all()
    .map((r) => r.owner);
}
