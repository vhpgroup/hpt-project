import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { seedProjects, seedPackages, seedItems } from "./seed-data.js";

const DB_PATH = resolve(process.env.DATABASE_PATH || "./data/hpt.db");

/**
 * Schema v2 — phân cấp: dự án → gói thầu → dòng hàng → đợt nhập.
 *
 * Tiến độ KHÔNG lưu sẵn: số lượng đã nhập = SUM(receipts.qty). Nhờ vậy phân biệt
 * được "chưa cập nhật" (không có đợt nhập nào) với "chưa nhập" (có đợt nhập
 * ghi nhận 0) mà không cần cột nullable dễ nhầm.
 */
const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  location   TEXT NOT NULL DEFAULT '',
  bid_date   TEXT,
  bid_type   TEXT NOT NULL DEFAULT '',
  note       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_projects_name ON projects(name);

CREATE TABLE IF NOT EXISTS packages (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  code       TEXT NOT NULL DEFAULT '',
  name       TEXT NOT NULL DEFAULT '',
  owner      TEXT NOT NULL DEFAULT '',
  location   TEXT NOT NULL DEFAULT '',
  deadline   TEXT,
  -- Giá trị trúng thầu, lưu bằng VND nguyên (tránh sai số dấu phẩy động).
  contract_value INTEGER,
  note       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
-- Mã TBMT là duy nhất toàn hệ thống, nhưng cho phép nhiều gói bỏ trống mã.
CREATE UNIQUE INDEX IF NOT EXISTS ux_packages_code ON packages(code) WHERE code <> '';
CREATE INDEX IF NOT EXISTS ix_packages_project ON packages(project_id);

CREATE TABLE IF NOT EXISTS items (
  id         TEXT PRIMARY KEY,
  package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  order_no   TEXT NOT NULL DEFAULT '',
  name       TEXT NOT NULL,
  unit       TEXT NOT NULL DEFAULT '',
  plan_qty   INTEGER NOT NULL DEFAULT 0,
  unit_price INTEGER NOT NULL DEFAULT 0,
  model      TEXT NOT NULL DEFAULT '',
  maker      TEXT NOT NULL DEFAULT '',
  note       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_items_package ON items(package_id);
CREATE INDEX IF NOT EXISTS ix_items_name    ON items(name);

CREATE TABLE IF NOT EXISTS receipts (
  id            TEXT PRIMARY KEY,
  item_id       TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  qty           INTEGER NOT NULL,
  received_date TEXT,
  note          TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_receipts_item ON receipts(item_id);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Nhật ký thay đổi. Cột changes là JSON: [{field, label, before, after}].
CREATE TABLE IF NOT EXISTS audit_logs (
  id           TEXT PRIMARY KEY,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  entity_label TEXT NOT NULL DEFAULT '',
  parent_label TEXT NOT NULL DEFAULT '',
  action       TEXT NOT NULL,
  changes      TEXT NOT NULL DEFAULT '[]',
  actor        TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS ix_audit_entity  ON audit_logs(entity_type, entity_id);
`;

export const DEFAULT_SETTINGS = {
  systemName: "Điều phối nhập hàng",
  pageSize: 10,
  owners: ["HPT", "Vision"],
  units: ["Bộ", "Chiếc", "Cái", "License", "Gói", "Hệ thống"],
};

let db;

export function getDb() {
  if (db) return db;

  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);

  migrateV1toV2(db);
  db.exec(SCHEMA);
  addMissingColumns(db);
  seedIfEmpty(db);
  return db;
}

/**
 * Database v1 có bảng `items.project_id` và `items.received_qty`. Chuyển sang v2:
 * mỗi dự án cũ tách thành 1 dự án + 1 gói thầu; mỗi received_qty khác NULL trở
 * thành một đợt nhập. Chạy trước SCHEMA để không đụng bảng mới.
 */
function migrateV1toV2(conn) {
  const hasProjects = tableExists(conn, "projects");
  if (!hasProjects || tableExists(conn, "packages")) return;

  const columns = conn.prepare("PRAGMA table_info(projects)").all().map((c) => c.name);
  if (!columns.includes("bid")) return; // đã là v2 hoặc bảng rỗng khác

  console.log("[db] Đang nâng cấp database v1 → v2…");
  const now = new Date().toISOString();

  const oldProjects = conn.prepare("SELECT * FROM projects").all();
  const oldItems = conn.prepare("SELECT * FROM items").all();

  conn.exec("PRAGMA foreign_keys = OFF");
  conn.exec("BEGIN");
  try {
    conn.exec("ALTER TABLE projects RENAME TO projects_v1");
    conn.exec("ALTER TABLE items RENAME TO items_v1");
    conn.exec(SCHEMA);

    const insProject = conn.prepare(
      "INSERT INTO projects (id, name, location, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const insPackage = conn.prepare(
      `INSERT INTO packages (id, project_id, code, name, owner, location, deadline, contract_value, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, '', ?, ?)`
    );
    const insItem = conn.prepare(
      `INSERT INTO items (id, package_id, order_no, name, unit, plan_qty, unit_price, model, maker, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`
    );
    const insReceipt = conn.prepare(
      "INSERT INTO receipts (id, item_id, qty, received_date, note, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    );

    const packageByOldProject = new Map();
    for (const p of oldProjects) {
      insProject.run(p.id, p.name, p.location || "", "", p.created_at || now, p.updated_at || now);
      const packageId = randomUUID();
      insPackage.run(
        packageId, p.id, p.bid || "", "", p.owner || "", p.location || "",
        p.created_at || now, p.updated_at || now
      );
      packageByOldProject.set(p.id, packageId);
    }

    for (const i of oldItems) {
      const packageId = packageByOldProject.get(i.project_id);
      if (!packageId) continue;
      insItem.run(
        i.id, packageId, i.order_no || "", i.name, i.unit || "", i.plan_qty || 0,
        i.model || "", i.maker || "", i.note || "", i.created_at || now, i.updated_at || now
      );
      if (i.received_qty !== null && i.received_qty !== undefined) {
        insReceipt.run(
          randomUUID(), i.id, i.received_qty, i.received_date || null,
          "Chuyển từ dữ liệu cũ", i.updated_at || now
        );
      }
    }

    conn.exec("DROP TABLE items_v1");
    conn.exec("DROP TABLE projects_v1");
    conn.exec("COMMIT");
    console.log(`[db] Đã nâng cấp: ${oldProjects.length} dự án, ${oldItems.length} dòng hàng.`);
  } catch (error) {
    conn.exec("ROLLBACK");
    throw error;
  } finally {
    conn.exec("PRAGMA foreign_keys = ON");
  }
}

/** Thêm cột mới vào database v2 đã tồn tại (SQLite không có ADD COLUMN IF NOT EXISTS). */
function addMissingColumns(conn) {
  const additions = [
    ["packages", "contract_value", "ALTER TABLE packages ADD COLUMN contract_value INTEGER"],
    ["items", "unit_price", "ALTER TABLE items ADD COLUMN unit_price INTEGER NOT NULL DEFAULT 0"],
    ["projects", "bid_date", "ALTER TABLE projects ADD COLUMN bid_date TEXT"],
    ["projects", "bid_type", "ALTER TABLE projects ADD COLUMN bid_type TEXT NOT NULL DEFAULT ''"],
  ];
  for (const [table, column, sql] of additions) {
    const columns = conn.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    if (!columns.includes(column)) conn.exec(sql);
  }
}

function tableExists(conn, name) {
  return Boolean(
    conn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(name)
  );
}

function seedIfEmpty(conn) {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    conn.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run(
      key,
      JSON.stringify(value)
    );
  }

  const { n } = conn.prepare("SELECT COUNT(*) AS n FROM projects").get();
  if (n > 0 || process.env.SEED_DEMO_DATA === "false") return;

  const now = new Date().toISOString();
  conn.exec("BEGIN");
  try {
    const insProject = conn.prepare(
      "INSERT INTO projects (id, name, location, note, created_at, updated_at) VALUES (?, ?, ?, '', ?, ?)"
    );
    const insPackage = conn.prepare(
      `INSERT INTO packages (id, project_id, code, name, owner, location, deadline, contract_value, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)`
    );
    const insItem = conn.prepare(
      `INSERT INTO items (id, package_id, order_no, name, unit, plan_qty, unit_price, model, maker, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)`
    );
    const insReceipt = conn.prepare(
      "INSERT INTO receipts (id, item_id, qty, received_date, note, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    );

    for (const p of seedProjects) insProject.run(p.id, p.name, p.location, now, now);
    for (const pk of seedPackages) {
      insPackage.run(pk.id, pk.projectId, pk.code, pk.name, pk.owner, pk.location, pk.deadline ?? null, pk.contractValue ?? null, now, now);
    }
    for (const i of seedItems) {
      insItem.run(i.id, i.packageId, i.orderNo, i.name, i.unit, i.planQty, i.unitPrice ?? 0, i.model, i.maker, now, now);
      for (const r of i.receipts ?? []) {
        insReceipt.run(randomUUID(), i.id, r.qty, r.date, r.note ?? "", now);
      }
    }
    conn.exec("COMMIT");
  } catch (error) {
    conn.exec("ROLLBACK");
    throw error;
  }
}

export function readSettings() {
  const rows = getDb().prepare("SELECT key, value FROM settings").all();
  const stored = Object.fromEntries(rows.map((r) => [r.key, safeParse(r.value)]));
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function writeSettings(patch) {
  const stmt = getDb().prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  );
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in DEFAULT_SETTINGS)) continue;
    stmt.run(key, JSON.stringify(value));
  }
  return readSettings();
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
