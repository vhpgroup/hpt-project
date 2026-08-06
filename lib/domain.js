export const STATUSES = ["Hoàn thành", "Đang nhập", "Chưa nhập", "Chưa cập nhật"];

/**
 * Suy ra trạng thái từ số lượng. `receivedQty === null` nghĩa là chưa ai cập nhật,
 * khác hẳn với `0` (đã xác nhận là chưa nhập được gì).
 */
export function deriveStatus(planQty, receivedQty) {
  if (receivedQty === null || receivedQty === undefined) return "Chưa cập nhật";
  if (planQty > 0 && receivedQty >= planQty) return "Hoàn thành";
  if (receivedQty <= 0) return "Chưa nhập";
  return "Đang nhập";
}

export function completionRate(planQty, receivedQty) {
  if (!planQty || planQty <= 0) return 0;
  const done = Math.min(receivedQty ?? 0, planQty);
  return Math.round((done / planQty) * 100);
}

/** Lỗi nghiệp vụ có mã HTTP đi kèm, để route handler trả về đúng status. */
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const trim = (v) => (typeof v === "string" ? v.trim() : v);

export function validateProject(input, { partial = false } = {}) {
  const out = {};
  const errors = {};

  if (!partial || input.name !== undefined) {
    const name = trim(input.name) || "";
    if (!name) errors.name = "Tên dự án là bắt buộc.";
    else if (name.length > 200) errors.name = "Tên dự án tối đa 200 ký tự.";
    else out.name = name;
  }
  for (const field of ["owner", "bid", "location"]) {
    if (!partial || input[field] !== undefined) {
      out[field] = trim(input[field]) || "";
    }
  }

  if (Object.keys(errors).length) {
    throw new ApiError(422, "Dữ liệu dự án không hợp lệ.", errors);
  }
  return out;
}

export function validateItem(input, { partial = false } = {}) {
  const out = {};
  const errors = {};

  if (!partial || input.projectId !== undefined) {
    const projectId = trim(input.projectId) || "";
    if (!projectId) errors.projectId = "Phải chọn dự án.";
    else out.projectId = projectId;
  }
  if (!partial || input.name !== undefined) {
    const name = trim(input.name) || "";
    if (!name) errors.name = "Tên hàng hóa là bắt buộc.";
    else out.name = name;
  }
  if (!partial || input.planQty !== undefined) {
    const planQty = toInt(input.planQty);
    if (planQty === null || planQty < 0) {
      errors.planQty = "Số lượng kế hoạch phải là số nguyên không âm.";
    } else out.planQty = planQty;
  }
  if (!partial || input.receivedQty !== undefined) {
    const raw = input.receivedQty;
    if (raw === null || raw === "" || raw === undefined) {
      out.receivedQty = null;
    } else {
      const receivedQty = toInt(raw);
      if (receivedQty === null || receivedQty < 0) {
        errors.receivedQty = "Số lượng đã nhập phải là số nguyên không âm.";
      } else out.receivedQty = receivedQty;
    }
  }
  if (!partial || input.receivedDate !== undefined) {
    const date = trim(input.receivedDate) || null;
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.receivedDate = "Ngày phải theo định dạng YYYY-MM-DD.";
    } else out.receivedDate = date;
  }
  for (const field of ["orderNo", "unit", "model", "maker", "note"]) {
    if (!partial || input[field] !== undefined) {
      out[field] = trim(input[field]) || "";
    }
  }

  const plan = out.planQty;
  const received = out.receivedQty;
  if (!errors.receivedQty && plan !== undefined && received != null && received > plan) {
    errors.receivedQty = "Số lượng đã nhập không thể vượt quá kế hoạch.";
  }

  if (Object.keys(errors).length) {
    throw new ApiError(422, "Dữ liệu hàng hóa không hợp lệ.", errors);
  }
  return out;
}

function toInt(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}
