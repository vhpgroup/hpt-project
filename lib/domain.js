export const STATUSES = ["Hoàn thành", "Đang nhập", "Chưa nhập", "Chưa cập nhật"];

/**
 * Trạng thái suy ra từ tổng các đợt nhập.
 * `receiptCount === 0` nghĩa là chưa ai cập nhật — khác hẳn với đã ghi nhận 0.
 */
export function deriveStatus(planQty, receivedQty, receiptCount) {
  if (!receiptCount) return "Chưa cập nhật";
  if (planQty > 0 && receivedQty >= planQty) return "Hoàn thành";
  if (receivedQty <= 0) return "Chưa nhập";
  return "Đang nhập";
}

export function completionRate(planQty, receivedQty) {
  if (!planQty || planQty <= 0) return 0;
  return Math.round((Math.min(receivedQty ?? 0, planQty) / planQty) * 100);
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const trim = (v) => (typeof v === "string" ? v.trim() : v);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateProject(input, { partial = false } = {}) {
  const out = {};
  const errors = {};

  if (!partial || input.name !== undefined) {
    const name = trim(input.name) || "";
    if (!name) errors.name = "Tên dự án là bắt buộc.";
    else if (name.length > 200) errors.name = "Tên dự án tối đa 200 ký tự.";
    else out.name = name;
  }
  for (const field of ["location", "note"]) {
    if (!partial || input[field] !== undefined) out[field] = trim(input[field]) || "";
  }

  if (Object.keys(errors).length) throw new ApiError(422, "Dữ liệu dự án không hợp lệ.", errors);
  return out;
}

export function validatePackage(input, { partial = false } = {}) {
  const out = {};
  const errors = {};

  if (!partial || input.projectId !== undefined) {
    const projectId = trim(input.projectId) || "";
    if (!projectId) errors.projectId = "Phải chọn dự án.";
    else out.projectId = projectId;
  }
  if (!partial || input.code !== undefined) {
    const code = (trim(input.code) || "").toUpperCase();
    // Mã TBMT trên Hệ thống mạng đấu thầu quốc gia: IB + 10 chữ số. Cho phép bỏ trống.
    if (code && !/^IB\d{10}$/.test(code)) {
      errors.code = "Mã TBMT phải có dạng IB + 10 chữ số (ví dụ IB2600343748).";
    } else out.code = code;
  }
  if (!partial || input.deadline !== undefined) {
    const deadline = trim(input.deadline) || null;
    if (deadline && !DATE_RE.test(deadline)) {
      errors.deadline = "Hạn giao hàng phải theo định dạng YYYY-MM-DD.";
    } else out.deadline = deadline;
  }
  if (!partial || input.contractValue !== undefined) {
    const raw = input.contractValue;
    if (raw === null || raw === "" || raw === undefined) {
      out.contractValue = null;
    } else {
      const value = toMoney(raw);
      if (value === null || value < 0) {
        errors.contractValue = "Giá trị gói thầu phải là số tiền không âm.";
      } else out.contractValue = value;
    }
  }
  for (const field of ["name", "owner", "location", "note"]) {
    if (!partial || input[field] !== undefined) out[field] = trim(input[field]) || "";
  }

  if (Object.keys(errors).length) throw new ApiError(422, "Dữ liệu gói thầu không hợp lệ.", errors);
  return out;
}

export function validateItem(input, { partial = false } = {}) {
  const out = {};
  const errors = {};

  if (!partial || input.packageId !== undefined) {
    const packageId = trim(input.packageId) || "";
    if (!packageId) errors.packageId = "Phải chọn gói thầu.";
    else out.packageId = packageId;
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
  if (!partial || input.unitPrice !== undefined) {
    const raw = input.unitPrice;
    if (raw === null || raw === "" || raw === undefined) {
      out.unitPrice = 0;
    } else {
      const price = toMoney(raw);
      if (price === null || price < 0) errors.unitPrice = "Đơn giá phải là số tiền không âm.";
      else out.unitPrice = price;
    }
  }
  for (const field of ["orderNo", "unit", "model", "maker", "note"]) {
    if (!partial || input[field] !== undefined) out[field] = trim(input[field]) || "";
  }

  if (Object.keys(errors).length) throw new ApiError(422, "Dữ liệu hàng hóa không hợp lệ.", errors);
  return out;
}

export function validateReceipt(input, { partial = false } = {}) {
  const out = {};
  const errors = {};

  if (!partial || input.qty !== undefined) {
    const qty = toInt(input.qty);
    if (qty === null || qty < 0) errors.qty = "Số lượng nhập phải là số nguyên không âm.";
    else out.qty = qty;
  }
  if (!partial || input.receivedDate !== undefined) {
    const date = trim(input.receivedDate) || null;
    if (date && !DATE_RE.test(date)) errors.receivedDate = "Ngày nhập phải theo định dạng YYYY-MM-DD.";
    else out.receivedDate = date;
  }
  if (!partial || input.note !== undefined) out.note = trim(input.note) || "";

  if (Object.keys(errors).length) throw new ApiError(422, "Dữ liệu đợt nhập không hợp lệ.", errors);
  return out;
}

/**
 * Ràng buộc "tổng đã nhập ≤ kế hoạch" được kiểm ở đây với số liệu ĐỌC TỪ DATABASE,
 * không dựa vào payload. Trước đây validate chéo chỉ chạy khi request gửi kèm cả
 * planQty, nên một PATCH chỉ có receivedQty lách được ràng buộc.
 */
export function assertWithinPlan({ planQty, currentReceived, delta, field = "qty" }) {
  const next = currentReceived + delta;
  if (next > planQty) {
    const remaining = Math.max(planQty - currentReceived, 0);
    throw new ApiError(422, "Tổng số lượng đã nhập vượt quá kế hoạch.", {
      [field]: `Chỉ còn ${remaining} đơn vị chưa nhập (kế hoạch ${planQty}, đã nhập ${currentReceived}).`,
    });
  }
}

/** Tiền lưu bằng VND nguyên. Chấp nhận chuỗi có dấu phân cách "1.500.000" hoặc "1,500,000". */
function toMoney(value) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : null;
  const text = String(value ?? "").trim().replace(/[.,\s]/g, "");
  if (text === "" || !/^\d+$/.test(text)) return null;
  return Number(text);
}

function toInt(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}
