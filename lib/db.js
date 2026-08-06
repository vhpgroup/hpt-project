import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { seedProjects, seedItems } from "./seed-data.js";

const DB_PATH = resolve(process.env.DATABASE_PATH || "./data/hpt.db");

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  owner       TEXT NOT NULL DEFAULT '',
  bid         TEXT NOT NULL DEFAULT '',
  location    TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  order_no      TEXT NOT NULL DEFAULT '',
  name          TEXT NOT NULL,
  unit          TEXT NOT NULL DEFAULT '',
  plan_qty      INTEGER NOT NULL DEFAULT 0,
  received_qty  INTEGER,
  received_date TEXT,
  model         TEXT NOT NULL DEFAULT '',
  maker         TEXT NOT NULL DEFAULT '',
  note          TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_project ON items(project_id);
CREATE INDEX IF NOT EXISTS idx_items_name    ON items(name);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

let db;

/** Lazily open (and on first use, migrate + seed) the SQLite database. */
export function getDb() {
  if (db) return db;

  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec(SCHEMA);
  seedIfEmpty(db);
  return db;
}

function seedIfEmpty(conn) {
  const { n } = conn.prepare("SELECT COUNT(*) AS n FROM projects").get();
  if (n > 0) return;

  const now = new Date().toISOString();
  const withDemoData = process.env.SEED_DEMO_DATA !== "false";
  const insertProject = conn.prepare(
    `INSERT INTO projects (id, name, owner, bid, location, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertItem = conn.prepare(
    `INSERT INTO items (id, project_id, order_no, name, unit, plan_qty, received_qty,
                        received_date, model, maker, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  conn.exec("BEGIN");
  try {
    if (withDemoData) {
      for (const p of seedProjects) {
        insertProject.run(p.id, p.name, p.owner, p.bid, p.location, now, now);
      }
      for (const i of seedItems) {
        insertItem.run(
          i.id, i.projectId, i.orderNo, i.name, i.unit, i.planQty,
          i.receivedQty, i.receivedDate, i.model, i.maker, "", now, now
        );
      }
    }
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      conn.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run(
        key,
        JSON.stringify(value)
      );
    }
    conn.exec("COMMIT");
  } catch (err) {
    conn.exec("ROLLBACK");
    throw err;
  }
}

export const DEFAULT_SETTINGS = {
  systemName: "Điều phối nhập hàng",
  pageSize: 10,
  owners: ["HPT", "Vision"],
  units: ["Bộ", "Chiếc", "Cái", "License", "Gói", "Hệ thống"],
};

export function readSettings() {
  const rows = getDb().prepare("SELECT key, value FROM settings").all();
  const stored = Object.fromEntries(
    rows.map((r) => [r.key, safeParse(r.value)])
  );
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function writeSettings(patch) {
  const conn = getDb();
  const stmt = conn.prepare(
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
