import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

/**
 * Ngữ cảnh người thực hiện cho mỗi request. Chưa có xác thực nên lấy từ header
 * `x-actor`; khi thêm đăng nhập chỉ cần đổi chỗ set giá trị này.
 */
const actorStore = new AsyncLocalStorage();
export const DEFAULT_ACTOR = "Quản trị viên";

export function runWithActor(actor, fn) {
  return actorStore.run(actor || DEFAULT_ACTOR, fn);
}

export const currentActor = () => actorStore.getStore() || DEFAULT_ACTOR;

export const ENTITY_LABELS = {
  project: "Dự án",
  package: "Gói thầu",
  item: "Hàng hóa",
  receipt: "Đợt nhập",
};

export const ACTION_LABELS = {
  create: "Tạo mới",
  update: "Cập nhật",
  delete: "Xóa",
};

/** Nhãn tiếng Việt cho từng trường, dùng khi hiển thị nhật ký. */
const FIELD_LABELS = {
  name: "Tên",
  code: "Mã TBMT",
  owner: "Đơn vị phụ trách",
  location: "Địa điểm",
  deadline: "Hạn giao hàng",
  contractValue: "Giá trị gói thầu",
  note: "Ghi chú",
  projectId: "Dự án",
  packageId: "Gói thầu",
  orderNo: "STT",
  unit: "Đơn vị tính",
  planQty: "Số lượng kế hoạch",
  unitPrice: "Đơn giá",
  model: "Model / Ký mã hiệu",
  maker: "Hãng sản xuất",
  qty: "Số lượng",
  receivedDate: "Ngày nhập",
};

const MONEY_FIELDS = new Set(["contractValue", "unitPrice"]);

/**
 * So sánh hai bản ghi, chỉ giữ lại những trường thực sự đổi.
 * Trả về mảng rỗng nếu không có gì thay đổi — khi đó không ghi nhật ký.
 */
export function diffFields(before, after, fields) {
  const changes = [];
  for (const field of fields) {
    if (!(field in after)) continue;
    const from = normalize(before?.[field]);
    const to = normalize(after[field]);
    if (from === to) continue;
    changes.push({
      field,
      label: FIELD_LABELS[field] || field,
      money: MONEY_FIELDS.has(field),
      before: from,
      after: to,
    });
  }
  return changes;
}

function normalize(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

/** Ghi một dòng nhật ký. Gọi trong cùng transaction với thao tác gốc khi có thể. */
export function writeAudit(db, { entityType, entityId, entityLabel = "", parentLabel = "", action, changes = [] }) {
  db.prepare(
    `INSERT INTO audit_logs (id, entity_type, entity_id, entity_label, parent_label, action, changes, actor, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(), entityType, entityId, entityLabel, parentLabel, action,
    JSON.stringify(changes), currentActor(), new Date().toISOString()
  );
}

export function mapAuditRow(row) {
  let changes = [];
  try { changes = JSON.parse(row.changes); } catch { changes = []; }
  return {
    id: row.id,
    entityType: row.entity_type,
    entityTypeLabel: ENTITY_LABELS[row.entity_type] || row.entity_type,
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    parentLabel: row.parent_label,
    action: row.action,
    actionLabel: ACTION_LABELS[row.action] || row.action,
    changes,
    actor: row.actor,
    createdAt: row.created_at,
  };
}
