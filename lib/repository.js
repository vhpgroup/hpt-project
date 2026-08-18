import { randomUUID } from "node:crypto";
import { getDb } from "./db.js";
import { ApiError, assertWithinPlan, completionRate, deriveStatus } from "./domain.js";
import { diffFields, mapAuditRow, writeAudit } from "./audit.js";

const nowIso = () => new Date().toISOString();
const clampPageSize = (v, fallback = 10) => Math.min(Math.max(Number(v) || fallback, 1), 500);

/** Tổng đã nhập + số đợt, tính từ bảng receipts. */
const RECEIPT_AGG = `
  COALESCE((SELECT SUM(r.qty) FROM receipts r WHERE r.item_id = i.id), 0) AS received_qty,
  (SELECT COUNT(*) FROM receipts r WHERE r.item_id = i.id) AS receipt_count,
  (SELECT MAX(r.received_date) FROM receipts r WHERE r.item_id = i.id) AS last_received_date
`;

const STATUS_SQL = `
  CASE
    WHEN (SELECT COUNT(*) FROM receipts r WHERE r.item_id = i.id) = 0 THEN 'Chưa cập nhật'
    WHEN i.plan_qty > 0
     AND COALESCE((SELECT SUM(r.qty) FROM receipts r WHERE r.item_id = i.id), 0) >= i.plan_qty
     THEN 'Hoàn thành'
    WHEN COALESCE((SELECT SUM(r.qty) FROM receipts r WHERE r.item_id = i.id), 0) <= 0 THEN 'Chưa nhập'
    ELSE 'Đang nhập'
  END
`;

const ITEM_SELECT = `
  SELECT i.*, ${RECEIPT_AGG},
         pk.id AS package_id, pk.code AS package_code, pk.name AS package_name,
         pk.owner, pk.location, pk.deadline,
         pj.id AS project_id, pj.name AS project_name
  FROM items i
  JOIN packages pk ON pk.id = i.package_id
  JOIN projects pj ON pj.id = pk.project_id
`;

function mapItem(row) {
  const receivedQty = row.received_qty ?? 0;
  return {
    id: row.id,
    packageId: row.package_id,
    packageCode: row.package_code,
    packageName: row.package_name,
    projectId: row.project_id,
    projectName: row.project_name,
    owner: row.owner,
    location: row.location,
    deadline: row.deadline,
    orderNo: row.order_no,
    name: row.name,
    unit: row.unit,
    planQty: row.plan_qty,
    unitPrice: row.unit_price ?? 0,
    amount: row.plan_qty * (row.unit_price ?? 0),
    receivedValue: receivedQty * (row.unit_price ?? 0),
    receivedQty,
    remainingQty: Math.max(row.plan_qty - receivedQty, 0),
    receiptCount: row.receipt_count ?? 0,
    receivedDate: row.last_received_date,
    model: row.model,
    maker: row.maker,
    note: row.note,
    status: deriveStatus(row.plan_qty, receivedQty, row.receipt_count),
    completion: completionRate(row.plan_qty, receivedQty),
    updatedAt: row.updated_at,
  };
}

/* ------------------------------------------------------------------ items */

export function listItems({ q, projectId, packageId, owner, status, page = 1, pageSize = 10 } = {}) {
  const where = [];
  const params = [];

  if (q) {
    // Bổ sung mã + tên gói thầu vào phạm vi tìm kiếm (trước đây thiếu, nên tra
    // theo mã TBMT không ra kết quả nào).
    where.push(`(i.name LIKE ? OR i.model LIKE ? OR i.maker LIKE ?
                 OR pj.name LIKE ? OR pk.code LIKE ? OR pk.name LIKE ?)`);
    const like = `%${q}%`;
    params.push(like, like, like, like, like, like);
  }
  if (projectId) { where.push("pj.id = ?"); params.push(projectId); }
  if (packageId) { where.push("pk.id = ?"); params.push(packageId); }
  if (owner)     { where.push("pk.owner = ?"); params.push(owner); }
  if (status)    { where.push(`${STATUS_SQL} = ?`); params.push(status); }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const db = getDb();

  const { total } = db
    .prepare(
      `SELECT COUNT(*) AS total FROM items i
       JOIN packages pk ON pk.id = i.package_id
       JOIN projects pj ON pj.id = pk.project_id ${whereSql}`
    )
    .get(...params);

  const safePageSize = clampPageSize(pageSize);
  const pageCount = Math.max(Math.ceil(total / safePageSize), 1);
  const safePage = Math.min(Math.max(Number(page) || 1, 1), pageCount);

  const rows = db
    .prepare(
      `${ITEM_SELECT} ${whereSql}
       ORDER BY pj.name, pk.code, CAST(i.order_no AS INTEGER), i.name
       LIMIT ? OFFSET ?`
    )
    .all(...params, safePageSize, (safePage - 1) * safePageSize);

  return { data: rows.map(mapItem), meta: { total, page: safePage, pageSize: safePageSize, pageCount } };
}

export function getItem(id) {
  const row = getDb().prepare(`${ITEM_SELECT} WHERE i.id = ?`).get(id);
  if (!row) throw new ApiError(404, "Không tìm thấy hàng hóa.");
  return mapItem(row);
}

export function createItem(data) {
  assertPackageExists(data.packageId);
  const db = getDb();
  const id = randomUUID();
  const ts = nowIso();
  db.prepare(
    `INSERT INTO items (id, package_id, order_no, name, unit, plan_qty, unit_price, model, maker, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, data.packageId, data.orderNo ?? "", data.name, data.unit ?? "", data.planQty ?? 0,
    data.unitPrice ?? 0, data.model ?? "", data.maker ?? "", data.note ?? "", ts, ts
  );
  const item = getItem(id);
  writeAudit(db, {
    entityType: "item", entityId: id, entityLabel: item.name,
    parentLabel: item.packageCode || item.packageName || item.projectName,
    action: "create",
    changes: diffFields({}, data, ITEM_AUDIT_FIELDS),
  });
  return item;
}

// Không đưa packageId vào nhật ký: quan hệ đã hiển thị qua parentLabel, log ID thô khó đọc.
const ITEM_AUDIT_FIELDS = ["orderNo", "name", "unit", "planQty", "unitPrice", "model", "maker", "note"];

export function updateItem(id, patch) {
  const current = getItem(id);
  if (patch.packageId) assertPackageExists(patch.packageId);

  // Không cho hạ kế hoạch xuống dưới số đã thực nhận.
  if (patch.planQty !== undefined && patch.planQty < current.receivedQty) {
    throw new ApiError(422, "Kế hoạch không thể nhỏ hơn số lượng đã nhập.", {
      planQty: `Đã nhập ${current.receivedQty} ${current.unit || "đơn vị"}, kế hoạch phải từ ${current.receivedQty} trở lên.`,
    });
  }

  const columns = {
    packageId: "package_id", orderNo: "order_no", name: "name", unit: "unit",
    planQty: "plan_qty", unitPrice: "unit_price", model: "model", maker: "maker", note: "note",
  };
  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(columns)) {
    if (patch[key] === undefined) continue;
    sets.push(`${column} = ?`);
    params.push(patch[key]);
  }
  if (sets.length) {
    const db = getDb();
    sets.push("updated_at = ?");
    params.push(nowIso(), id);
    db.prepare(`UPDATE items SET ${sets.join(", ")} WHERE id = ?`).run(...params);

    const changes = diffFields(current, patch, ITEM_AUDIT_FIELDS);
    if (changes.length) {
      writeAudit(db, {
        entityType: "item", entityId: id, entityLabel: current.name,
        parentLabel: current.packageCode || current.packageName,
        action: "update", changes,
      });
    }
  }
  return getItem(id);
}

export function deleteItem(id) {
  const db = getDb();
  const item = getItem(id);
  db.prepare("DELETE FROM items WHERE id = ?").run(id);
  writeAudit(db, {
    entityType: "item", entityId: id, entityLabel: item.name,
    parentLabel: item.packageCode || item.packageName, action: "delete",
  });
}

/* --------------------------------------------------------------- receipts */

const mapReceipt = (row) => ({
  id: row.id,
  itemId: row.item_id,
  qty: row.qty,
  receivedDate: row.received_date,
  note: row.note,
  createdAt: row.created_at,
});

export function listReceipts(itemId) {
  getItem(itemId);
  return getDb()
    .prepare("SELECT * FROM receipts WHERE item_id = ? ORDER BY received_date DESC, created_at DESC")
    .all(itemId)
    .map(mapReceipt);
}

/** Ghi nhận một đợt nhập; chặn nếu tổng cộng dồn vượt kế hoạch. */
export function createReceipt(itemId, data) {
  const item = getItem(itemId);
  assertWithinPlan({
    planQty: item.planQty,
    currentReceived: item.receivedQty,
    delta: data.qty,
  });

  const db = getDb();
  const id = randomUUID();
  db.prepare("INSERT INTO receipts (id, item_id, qty, received_date, note, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, itemId, data.qty, data.receivedDate ?? null, data.note ?? "", nowIso());
  writeAudit(db, {
    entityType: "receipt", entityId: id, entityLabel: `+${data.qty} ${item.unit || ""}`.trim(),
    parentLabel: item.name, action: "create",
    changes: diffFields({}, data, ["qty", "receivedDate", "note"]),
  });
  return { receipt: mapReceipt(db.prepare("SELECT * FROM receipts WHERE id = ?").get(id)), item: getItem(itemId) };
}

export function updateReceipt(receiptId, patch) {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM receipts WHERE id = ?").get(receiptId);
  if (!existing) throw new ApiError(404, "Không tìm thấy đợt nhập.");

  const item = getItem(existing.item_id);
  if (patch.qty !== undefined) {
    assertWithinPlan({
      planQty: item.planQty,
      currentReceived: item.receivedQty - existing.qty,
      delta: patch.qty,
    });
  }

  const columns = { qty: "qty", receivedDate: "received_date", note: "note" };
  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(columns)) {
    if (patch[key] === undefined) continue;
    sets.push(`${column} = ?`);
    params.push(patch[key]);
  }
  if (sets.length) {
    params.push(receiptId);
    db.prepare(`UPDATE receipts SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    const before = { qty: existing.qty, receivedDate: existing.received_date, note: existing.note };
    const changes = diffFields(before, patch, ["qty", "receivedDate", "note"]);
    if (changes.length) {
      writeAudit(db, {
        entityType: "receipt", entityId: receiptId, entityLabel: existing.received_date || "Đợt nhập",
        parentLabel: item.name, action: "update", changes,
      });
    }
  }
  return { receipt: mapReceipt(db.prepare("SELECT * FROM receipts WHERE id = ?").get(receiptId)), item: getItem(existing.item_id) };
}

export function deleteReceipt(receiptId) {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM receipts WHERE id = ?").get(receiptId);
  if (!existing) throw new ApiError(404, "Không tìm thấy đợt nhập.");
  const item = getItem(existing.item_id);
  db.prepare("DELETE FROM receipts WHERE id = ?").run(receiptId);
  writeAudit(db, {
    entityType: "receipt", entityId: receiptId,
    entityLabel: `${existing.qty} (${existing.received_date || "không rõ ngày"})`,
    parentLabel: item.name, action: "delete",
  });
  return getItem(existing.item_id);
}

/* --------------------------------------------------------------- packages */

const PACKAGE_AGG = `
  SELECT pk.*, pj.name AS project_name, pj.location AS project_location,
    (SELECT COUNT(*) FROM items i WHERE i.package_id = pk.id) AS item_count,
    COALESCE((SELECT SUM(i.plan_qty) FROM items i WHERE i.package_id = pk.id), 0) AS plan_qty,
    COALESCE((SELECT SUM(r.qty) FROM receipts r JOIN items i ON i.id = r.item_id WHERE i.package_id = pk.id), 0) AS received_qty,
    COALESCE((SELECT SUM(i.plan_qty * i.unit_price) FROM items i WHERE i.package_id = pk.id), 0) AS plan_value,
    COALESCE((SELECT SUM(r.qty * i.unit_price) FROM receipts r JOIN items i ON i.id = r.item_id WHERE i.package_id = pk.id), 0) AS received_value,
    (SELECT COUNT(*) FROM items i WHERE i.package_id = pk.id AND ${statusIs("Hoàn thành")}) AS done,
    (SELECT COUNT(*) FROM items i WHERE i.package_id = pk.id AND ${statusIs("Đang nhập")}) AS in_progress,
    (SELECT COUNT(*) FROM items i WHERE i.package_id = pk.id AND ${statusIs("Chưa nhập")}) AS not_started,
    (SELECT COUNT(*) FROM items i WHERE i.package_id = pk.id AND ${statusIs("Chưa cập nhật")}) AS stale,
    (SELECT MAX(r.received_date) FROM receipts r JOIN items i ON i.id = r.item_id WHERE i.package_id = pk.id) AS last_receipt
  FROM packages pk JOIN projects pj ON pj.id = pk.project_id
`;

function statusIs(status) {
  return `(${STATUS_SQL}) = '${status}'`;
}

function mapPackage(row) {
  const planQty = row.plan_qty ?? 0;
  const receivedQty = row.received_qty ?? 0;
  const today = new Date().toISOString().slice(0, 10);
  const completion = completionRate(planQty, receivedQty);
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    code: row.code,
    name: row.name,
    owner: row.owner,
    location: row.location || row.project_location,
    deadline: row.deadline,
    note: row.note,
    contractValue: row.contract_value,
    planValue: row.plan_value ?? 0,
    receivedValue: row.received_value ?? 0,
    itemCount: row.item_count ?? 0,
    planQty,
    receivedQty,
    completion,
    done: row.done ?? 0,
    inProgress: row.in_progress ?? 0,
    notStarted: row.not_started ?? 0,
    stale: row.stale ?? 0,
    lastReceiptDate: row.last_receipt,
    // Cảnh báo tiến độ so với hạn giao hàng.
    overdue: Boolean(row.deadline && row.deadline < today && completion < 100),
    daysToDeadline: row.deadline ? daysBetween(today, row.deadline) : null,
    updatedAt: row.updated_at,
  };
}

function daysBetween(fromIso, toIso) {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86400000);
}

export function listPackages({ q, projectId, owner, page = 1, pageSize = 10 } = {}) {
  const where = [];
  const params = [];
  if (q) {
    where.push("(pk.code LIKE ? OR pk.name LIKE ? OR pj.name LIKE ? OR pk.location LIKE ?)");
    const l = `%${q}%`;
    params.push(l, l, l, l);
  }
  if (projectId) { where.push("pk.project_id = ?"); params.push(projectId); }
  if (owner)     { where.push("pk.owner = ?"); params.push(owner); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const db = getDb();
  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM packages pk JOIN projects pj ON pj.id = pk.project_id ${whereSql}`)
    .get(...params);

  const safePageSize = clampPageSize(pageSize);
  const pageCount = Math.max(Math.ceil(total / safePageSize), 1);
  const safePage = Math.min(Math.max(Number(page) || 1, 1), pageCount);

  const rows = db
    .prepare(`${PACKAGE_AGG} ${whereSql} ORDER BY pj.name, pk.code LIMIT ? OFFSET ?`)
    .all(...params, safePageSize, (safePage - 1) * safePageSize);

  return { data: rows.map(mapPackage), meta: { total, page: safePage, pageSize: safePageSize, pageCount } };
}

export function getPackage(id) {
  const row = getDb().prepare(`${PACKAGE_AGG} WHERE pk.id = ?`).get(id);
  if (!row) throw new ApiError(404, "Không tìm thấy gói thầu.");
  return mapPackage(row);
}

export function createPackage(data) {
  assertProjectExists(data.projectId);
  const id = randomUUID();
  const ts = nowIso();
  try {
    getDb()
      .prepare(
        `INSERT INTO packages (id, project_id, code, name, owner, location, deadline, contract_value, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, data.projectId, data.code ?? "", data.name ?? "", data.owner ?? "",
           data.location ?? "", data.deadline ?? null, data.contractValue ?? null, data.note ?? "", ts, ts);
  } catch (err) {
    throw duplicateCode(err);
  }
  const pkg = getPackage(id);
  writeAudit(getDb(), {
    entityType: "package", entityId: id, entityLabel: pkg.code || pkg.name,
    parentLabel: pkg.projectName, action: "create",
    changes: diffFields({}, data, PACKAGE_AUDIT_FIELDS),
  });
  return pkg;
}

const PACKAGE_AUDIT_FIELDS = ["code", "name", "owner", "location", "deadline", "contractValue", "note"];

export function updatePackage(id, patch) {
  const current = getPackage(id);
  if (patch.projectId) assertProjectExists(patch.projectId);

  const columns = {
    projectId: "project_id", code: "code", name: "name", owner: "owner",
    location: "location", deadline: "deadline", contractValue: "contract_value", note: "note",
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
    try {
      getDb().prepare(`UPDATE packages SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    } catch (err) {
      throw duplicateCode(err);
    }
    const changes = diffFields(current, patch, PACKAGE_AUDIT_FIELDS);
    if (changes.length) {
      writeAudit(getDb(), {
        entityType: "package", entityId: id, entityLabel: current.code || current.name,
        parentLabel: current.projectName, action: "update", changes,
      });
    }
  }
  return getPackage(id);
}

export function deletePackage(id) {
  const db = getDb();
  const pkg = getPackage(id);
  db.prepare("DELETE FROM packages WHERE id = ?").run(id);
  writeAudit(db, {
    entityType: "package", entityId: id, entityLabel: pkg.code || pkg.name,
    parentLabel: pkg.projectName, action: "delete",
  });
}

function duplicateCode(err) {
  if (String(err.message).includes("UNIQUE")) {
    return new ApiError(409, "Mã TBMT đã tồn tại ở gói thầu khác.", { code: "Mã TBMT đã tồn tại." });
  }
  return err;
}

/* --------------------------------------------------------------- projects */

const PROJECT_AUDIT_FIELDS = ["name", "location", "bidDate", "bidType", "note"];

const PROJECT_AGG = `
  SELECT pj.*,
    (SELECT COUNT(*) FROM packages pk WHERE pk.project_id = pj.id) AS package_count,
    (SELECT COUNT(*) FROM items i JOIN packages pk ON pk.id = i.package_id WHERE pk.project_id = pj.id) AS item_count,
    COALESCE((SELECT SUM(i.plan_qty) FROM items i JOIN packages pk ON pk.id = i.package_id WHERE pk.project_id = pj.id), 0) AS plan_qty,
    COALESCE((SELECT SUM(r.qty) FROM receipts r JOIN items i ON i.id = r.item_id JOIN packages pk ON pk.id = i.package_id WHERE pk.project_id = pj.id), 0) AS received_qty,
    COALESCE((SELECT SUM(i.plan_qty * i.unit_price) FROM items i JOIN packages pk ON pk.id = i.package_id WHERE pk.project_id = pj.id), 0) AS plan_value,
    COALESCE((SELECT SUM(r.qty * i.unit_price) FROM receipts r JOIN items i ON i.id = r.item_id JOIN packages pk ON pk.id = i.package_id WHERE pk.project_id = pj.id), 0) AS received_value,
    COALESCE((SELECT SUM(pk.contract_value) FROM packages pk WHERE pk.project_id = pj.id), 0) AS contract_value,
    (SELECT GROUP_CONCAT(DISTINCT pk.owner) FROM packages pk WHERE pk.project_id = pj.id AND pk.owner <> '') AS owners
  FROM projects pj
`;

function mapProject(row) {
  const planQty = row.plan_qty ?? 0;
  const receivedQty = row.received_qty ?? 0;
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    bidDate: row.bid_date,
    bidType: row.bid_type,
    note: row.note,
    packageCount: row.package_count ?? 0,
    itemCount: row.item_count ?? 0,
    planQty,
    receivedQty,
    contractValue: row.contract_value ?? 0,
    planValue: row.plan_value ?? 0,
    receivedValue: row.received_value ?? 0,
    completion: completionRate(planQty, receivedQty),
    owners: row.owners ? row.owners.split(",") : [],
    updatedAt: row.updated_at,
  };
}

export function listProjects({ q, owner, page = 1, pageSize = 10 } = {}) {
  const where = [];
  const params = [];
  if (q) {
    where.push(`(pj.name LIKE ? OR pj.location LIKE ?
                 OR EXISTS (SELECT 1 FROM packages pk WHERE pk.project_id = pj.id AND (pk.code LIKE ? OR pk.name LIKE ?)))`);
    const l = `%${q}%`;
    params.push(l, l, l, l);
  }
  if (owner) {
    where.push("EXISTS (SELECT 1 FROM packages pk WHERE pk.project_id = pj.id AND pk.owner = ?)");
    params.push(owner);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const db = getDb();
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM projects pj ${whereSql}`).get(...params);

  const safePageSize = clampPageSize(pageSize);
  const pageCount = Math.max(Math.ceil(total / safePageSize), 1);
  const safePage = Math.min(Math.max(Number(page) || 1, 1), pageCount);

  const rows = db
    .prepare(`${PROJECT_AGG} ${whereSql} ORDER BY pj.name LIMIT ? OFFSET ?`)
    .all(...params, safePageSize, (safePage - 1) * safePageSize);

  return { data: rows.map(mapProject), meta: { total, page: safePage, pageSize: safePageSize, pageCount } };
}

export function getProject(id) {
  const row = getDb().prepare(`${PROJECT_AGG} WHERE pj.id = ?`).get(id);
  if (!row) throw new ApiError(404, "Không tìm thấy dự án.");
  return mapProject(row);
}

export function createProject(data) {
  const id = randomUUID();
  const ts = nowIso();
  try {
    getDb()
      .prepare("INSERT INTO projects (id, name, location, bid_date, bid_type, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, data.name, data.location ?? "", data.bidDate ?? null, data.bidType ?? "", data.note ?? "", ts, ts);
  } catch (err) {
    throw duplicateProject(err);
  }
  writeAudit(getDb(), {
    entityType: "project", entityId: id, entityLabel: data.name, action: "create",
    changes: diffFields({}, data, PROJECT_AUDIT_FIELDS),
  });
  return getProject(id);
}

export function updateProject(id, patch) {
  const current = getProject(id);
  const columns = { name: "name", location: "location", bidDate: "bid_date", bidType: "bid_type", note: "note" };
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
      throw duplicateProject(err);
    }
    const changes = diffFields(current, patch, PROJECT_AUDIT_FIELDS);
    if (changes.length) {
      writeAudit(getDb(), {
        entityType: "project", entityId: id, entityLabel: current.name, action: "update", changes,
      });
    }
  }
  return getProject(id);
}

export function deleteProject(id) {
  const db = getDb();
  const project = getProject(id);
  db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  writeAudit(db, {
    entityType: "project", entityId: id, entityLabel: project.name, action: "delete",
  });
}

function duplicateProject(err) {
  if (String(err.message).includes("UNIQUE")) {
    return new ApiError(409, "Dự án trùng tên đã tồn tại.", { name: "Tên dự án đã tồn tại." });
  }
  return err;
}

function assertProjectExists(projectId) {
  if (!getDb().prepare("SELECT id FROM projects WHERE id = ?").get(projectId)) {
    throw new ApiError(422, "Dự án không tồn tại.", { projectId: "Dự án không tồn tại." });
  }
}

function assertPackageExists(packageId) {
  if (!getDb().prepare("SELECT id FROM packages WHERE id = ?").get(packageId)) {
    throw new ApiError(422, "Gói thầu không tồn tại.", { packageId: "Gói thầu không tồn tại." });
  }
}

/* ------------------------------------------------------------------ stats */

export function getStats() {
  const db = getDb();

  const totals = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM projects) AS projectCount,
         (SELECT COUNT(*) FROM packages) AS packageCount,
         (SELECT COUNT(*) FROM items) AS itemCount,
         COALESCE((SELECT SUM(plan_qty) FROM items), 0) AS planQty,
         COALESCE((SELECT SUM(qty) FROM receipts), 0) AS receivedQty,
         COALESCE((SELECT SUM(plan_qty * unit_price) FROM items), 0) AS planValue,
         COALESCE((SELECT SUM(r.qty * i.unit_price) FROM receipts r JOIN items i ON i.id = r.item_id), 0) AS receivedValue,
         COALESCE((SELECT SUM(contract_value) FROM packages), 0) AS contractValue`
    )
    .get();

  const byStatus = Object.fromEntries(
    db.prepare(`SELECT ${STATUS_SQL} AS status, COUNT(*) AS count FROM items i GROUP BY status`)
      .all()
      .map((r) => [r.status, r.count])
  );

  const attention = db
    .prepare(
      `${PACKAGE_AGG}
       WHERE (SELECT COUNT(*) FROM items i WHERE i.package_id = pk.id) > 0
       ORDER BY
         CASE WHEN pk.deadline IS NOT NULL AND pk.deadline < date('now') THEN 0 ELSE 1 END,
         pk.deadline IS NULL, pk.deadline ASC
       LIMIT 20`
    )
    .all()
    .map(mapPackage)
    .filter((p) => p.completion < 100)
    .slice(0, 6);

  const overdueCount = db
    .prepare(
      `SELECT COUNT(*) AS n FROM packages pk
       WHERE pk.deadline IS NOT NULL AND pk.deadline < date('now')
         AND COALESCE((SELECT SUM(i.plan_qty) FROM items i WHERE i.package_id = pk.id), 0) >
             COALESCE((SELECT SUM(r.qty) FROM receipts r JOIN items i ON i.id = r.item_id WHERE i.package_id = pk.id), 0)`
    )
    .get().n;

  return {
    ...totals,
    completion: completionRate(totals.planQty, totals.receivedQty),
    byStatus,
    attention,
    overdueCount,
  };
}

/* ------------------------------------------------------------------ audit */

export function listAudit({ entityType, entityId, actor, page = 1, pageSize = 20 } = {}) {
  const where = [];
  const params = [];
  if (entityType) { where.push("entity_type = ?"); params.push(entityType); }
  if (entityId)   { where.push("entity_id = ?");   params.push(entityId); }
  if (actor)      { where.push("actor = ?");       params.push(actor); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const db = getDb();
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM audit_logs ${whereSql}`).get(...params);

  const safePageSize = clampPageSize(pageSize, 20);
  const pageCount = Math.max(Math.ceil(total / safePageSize), 1);
  const safePage = Math.min(Math.max(Number(page) || 1, 1), pageCount);

  const rows = db
    .prepare(`SELECT * FROM audit_logs ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, safePageSize, (safePage - 1) * safePageSize);

  return { data: rows.map(mapAuditRow), meta: { total, page: safePage, pageSize: safePageSize, pageCount } };
}

export function listOwners() {
  return getDb()
    .prepare("SELECT DISTINCT owner FROM packages WHERE owner <> '' ORDER BY owner")
    .all()
    .map((r) => r.owner);
}

export function listAllItemsForExport(filters = {}) {
  return listItems({ ...filters, page: 1, pageSize: 500 }).data;
}

/* ----------------------------------------------------------------- import */

/**
 * Nhập nhiều dòng trong một transaction. Tự tạo dự án/gói thầu chưa tồn tại.
 * `mode`:
 *   - "skip" (mặc định): bỏ qua dòng đã tồn tại (cùng gói + STT + tên hàng)
 *   - "replace": ghi đè kế hoạch/thuộc tính của dòng đã tồn tại
 */
export function importItems(rows, { mode = "skip" } = {}) {
  const db = getDb();
  const now = nowIso();

  const projectByName = new Map(
    db.prepare("SELECT id, name FROM projects").all().map((p) => [key(p.name), p.id])
  );
  const packageByCode = new Map(
    db.prepare("SELECT id, code FROM packages WHERE code <> ''").all().map((p) => [key(p.code), p.id])
  );
  const packageByProjectName = new Map(
    db.prepare("SELECT id, project_id, name FROM packages").all()
      .map((p) => [`${p.project_id}::${key(p.name)}`, p.id])
  );
  const existingItems = new Set(
    db.prepare("SELECT package_id, order_no, name FROM items").all()
      .map((i) => `${i.package_id}::${key(i.order_no)}::${key(i.name)}`)
  );

  const insProject = db.prepare(
    "INSERT INTO projects (id, name, location, note, created_at, updated_at) VALUES (?, ?, ?, '', ?, ?)"
  );
  const insPackage = db.prepare(
    `INSERT INTO packages (id, project_id, code, name, owner, location, deadline, contract_value, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)`
  );
  const insItem = db.prepare(
    `INSERT INTO items (id, package_id, order_no, name, unit, plan_qty, unit_price, model, maker, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insReceipt = db.prepare(
    "INSERT INTO receipts (id, item_id, qty, received_date, note, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  );

  const result = { imported: 0, skipped: 0, replaced: 0, projectsCreated: 0, packagesCreated: 0, receiptsCreated: 0 };
  const importedOwners = new Set();
  const importedUnits = new Set();

  db.exec("BEGIN IMMEDIATE");
  try {
    for (const row of rows) {
      // --- dự án ---
      let projectId = projectByName.get(key(row.project.name));
      if (!projectId) {
        projectId = randomUUID();
        insProject.run(projectId, row.project.name, row.project.location, now, now);
        projectByName.set(key(row.project.name), projectId);
        result.projectsCreated += 1;
      }

      // --- gói thầu: ưu tiên khớp theo mã TBMT, sau đó theo tên trong cùng dự án ---
      const code = row.package.code || "";
      let packageId = code ? packageByCode.get(key(code)) : undefined;
      if (!packageId) packageId = packageByProjectName.get(`${projectId}::${key(row.package.name)}`);
      if (!packageId) {
        packageId = randomUUID();
        insPackage.run(
          packageId, projectId, code, row.package.name, row.package.owner,
          row.package.location || row.project.location, row.package.deadline ?? null,
          row.package.contractValue ?? null, now, now
        );
        if (code) packageByCode.set(key(code), packageId);
        packageByProjectName.set(`${projectId}::${key(row.package.name)}`, packageId);
        result.packagesCreated += 1;
      }

      // --- chống trùng dòng hàng ---
      const itemKey = `${packageId}::${key(row.item.orderNo)}::${key(row.item.name)}`;
      if (existingItems.has(itemKey)) {
        if (mode === "skip") { result.skipped += 1; continue; }
        const existing = db
          .prepare("SELECT id FROM items WHERE package_id = ? AND lower(trim(order_no)) = ? AND lower(trim(name)) = ?")
          .get(packageId, key(row.item.orderNo), key(row.item.name));
        db.prepare(
          "UPDATE items SET unit = ?, plan_qty = ?, unit_price = ?, model = ?, maker = ?, note = ?, updated_at = ? WHERE id = ?"
        ).run(row.item.unit, row.item.planQty, row.item.unitPrice ?? 0, row.item.model, row.item.maker, row.item.note, now, existing.id);
        result.replaced += 1;
        continue;
      }

      const itemId = randomUUID();
      insItem.run(
        itemId, packageId, row.item.orderNo, row.item.name, row.item.unit,
        row.item.planQty, row.item.unitPrice ?? 0, row.item.model, row.item.maker, row.item.note, now, now
      );
      existingItems.add(itemKey);
      result.imported += 1;

      if (row.receipt) {
        insReceipt.run(randomUUID(), itemId, row.receipt.qty, row.receipt.receivedDate ?? null, "Nhập từ Excel", now);
        result.receiptsCreated += 1;
      }

      if (row.package.owner) importedOwners.add(row.package.owner);
      if (row.item.unit) importedUnits.add(row.item.unit);
    }

    mergeSettingValues(db, "owners", importedOwners);
    mergeSettingValues(db, "units", importedUnits);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return result;
}

/** Đối chiếu file Excel với dữ liệu hiện có, không ghi gì — dùng cho bước xem trước. */
export function previewImport(rows) {
  const db = getDb();
  const existingItems = new Set(
    db.prepare(
      `SELECT i.package_id, i.order_no, i.name, pk.code, pk.name AS package_name, pj.name AS project_name
       FROM items i JOIN packages pk ON pk.id = i.package_id JOIN projects pj ON pj.id = pk.project_id`
    ).all().map((i) => `${key(i.project_name)}::${key(i.code || i.package_name)}::${key(i.order_no)}::${key(i.name)}`)
  );
  const knownProjects = new Set(db.prepare("SELECT name FROM projects").all().map((p) => key(p.name)));
  const knownPackages = new Set(
    db.prepare("SELECT code, name, project_id FROM packages").all().map((p) => key(p.code || p.name))
  );

  let duplicates = 0;
  const newProjects = new Set();
  const newPackages = new Set();
  const duplicateRows = [];

  for (const row of rows) {
    const packageKey = key(row.package.code || row.package.name);
    const itemKey = `${key(row.project.name)}::${packageKey}::${key(row.item.orderNo)}::${key(row.item.name)}`;
    if (existingItems.has(itemKey)) {
      duplicates += 1;
      if (duplicateRows.length < 10) {
        duplicateRows.push({ row: row.rowNumber, name: row.item.name, package: row.package.code || row.package.name });
      }
    }
    if (!knownProjects.has(key(row.project.name))) newProjects.add(key(row.project.name));
    if (!knownPackages.has(packageKey)) newPackages.add(packageKey);
  }

  return {
    total: rows.length,
    duplicates,
    newRows: rows.length - duplicates,
    newProjects: newProjects.size,
    newPackages: newPackages.size,
    duplicateRows,
  };
}

const key = (value) => String(value ?? "").trim().toLocaleLowerCase("vi");

function mergeSettingValues(db, settingKey, additions) {
  if (additions.size === 0) return;
  const stored = db.prepare("SELECT value FROM settings WHERE key = ?").get(settingKey);
  let current = [];
  try { current = stored ? JSON.parse(stored.value) : []; } catch { current = []; }
  const values = [...new Set([...current, ...additions])].sort((a, b) => a.localeCompare(b, "vi"));
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(settingKey, JSON.stringify(values));
}
