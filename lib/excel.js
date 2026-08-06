import ExcelJS from "exceljs";
import { ApiError, validateItem, validateProject } from "./domain.js";

const MAX_ROWS = 1000;

const HEADER_ALIASES = {
  projectName: ["du an", "ten du an", "project"],
  owner: ["don vi", "don vi phu trach", "owner"],
  bid: ["ma tbmt", "tbmt"],
  location: ["dia diem", "dia diem du an"],
  orderNo: ["stt", "thu tu"],
  name: ["hang hoa", "ten hang hoa", "danh muc hang hoa"],
  unit: ["dvt", "don vi tinh"],
  planQty: ["ke hoach", "so luong ke hoach", "khoi luong ke hoach"],
  receivedQty: ["da nhap", "so luong da nhap"],
  receivedDate: ["ngay nhap", "ngay cap nhat"],
  model: ["ky ma hieu", "model"],
  maker: ["hang sx", "hang san xuat", "nha san xuat"],
  note: ["ghi chu", "note"],
};

const REQUIRED_HEADERS = ["projectName", "name", "planQty"];
const HEADER_LABELS = {
  projectName: "Dự án",
  name: "Hàng hóa",
  planQty: "Kế hoạch",
};

export async function parseImportWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new ApiError(422, "Không đọc được file Excel. Hãy dùng file .xlsx hợp lệ.");
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new ApiError(422, "File Excel không có trang dữ liệu.");

  const { rowNumber: headerRowNumber, columns } = findHeaderRow(sheet);
  const missing = REQUIRED_HEADERS.filter((key) => !columns.has(key));
  if (missing.length) {
    throw new ApiError(422, `Thiếu cột bắt buộc: ${missing.map((key) => HEADER_LABELS[key]).join(", ")}.`);
  }

  const rows = [];
  const errors = [];
  for (let rowNumber = headerRowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const source = Object.fromEntries(
      [...columns.entries()].map(([key, column]) => [key, readCell(row.getCell(column))])
    );
    if (Object.values(source).every((value) => value === "" || value == null)) continue;
    if (rows.length >= MAX_ROWS) {
      errors.push({ row: rowNumber, message: `File vượt quá giới hạn ${MAX_ROWS} dòng.` });
      break;
    }

    try {
      const project = validateProject({
        name: asText(source.projectName),
        owner: asText(source.owner),
        bid: asText(source.bid),
        location: asText(source.location),
      });
      const item = validateItem({
        projectId: "excel-import",
        orderNo: asText(source.orderNo),
        name: asText(source.name),
        unit: asText(source.unit),
        planQty: numberOrRaw(source.planQty),
        receivedQty: source.receivedQty === "" || source.receivedQty == null ? null : numberOrRaw(source.receivedQty),
        receivedDate: normalizeDate(source.receivedDate),
        model: asText(source.model),
        maker: asText(source.maker),
        note: asText(source.note),
      });
      delete item.projectId;
      rows.push({ project, item, rowNumber });
    } catch (error) {
      const messages = error?.details ? Object.values(error.details) : [error?.message || "Dữ liệu không hợp lệ."];
      errors.push({ row: rowNumber, message: messages.join(" ") });
    }
  }

  if (errors.length) {
    throw new ApiError(422, `File có ${errors.length} dòng chưa hợp lệ.`, { rows: errors.slice(0, 50) });
  }
  if (rows.length === 0) throw new ApiError(422, "File Excel không có dòng dữ liệu để nhập.");
  return rows;
}

export async function createImportTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HPT Project";
  const sheet = workbook.addWorksheet("Nhap hang");
  sheet.columns = [
    { header: "Dự án", key: "projectName", width: 30 },
    { header: "Đơn vị phụ trách", key: "owner", width: 20 },
    { header: "Mã TBMT", key: "bid", width: 18 },
    { header: "Địa điểm", key: "location", width: 20 },
    { header: "STT", key: "orderNo", width: 8 },
    { header: "Hàng hóa", key: "name", width: 34 },
    { header: "ĐVT", key: "unit", width: 12 },
    { header: "Kế hoạch", key: "planQty", width: 12 },
    { header: "Đã nhập", key: "receivedQty", width: 12 },
    { header: "Ngày nhập", key: "receivedDate", width: 14 },
    { header: "Ký mã hiệu", key: "model", width: 22 },
    { header: "Hãng SX", key: "maker", width: 18 },
    { header: "Ghi chú", key: "note", width: 28 },
  ];
  sheet.addRow({
    projectName: "Dự án mẫu", owner: "HPT", bid: "IB0000000000", location: "Hà Nội",
    orderNo: "1", name: "Máy tính để bàn", unit: "Bộ", planQty: 10,
    receivedQty: 4, receivedDate: "2026-08-06", model: "MODEL-01", maker: "Dell",
    note: "Xóa dòng mẫu này trước khi nhập dữ liệu thật",
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: "M1" };
  const header = sheet.getRow(1);
  header.height = 24;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
  header.alignment = { vertical: "middle" };

  const guide = workbook.addWorksheet("Huong dan");
  guide.getColumn(1).width = 105;
  [
    "HƯỚNG DẪN NHẬP HÀNG HÓA",
    "1. Giữ nguyên tên các cột ở trang 'Nhap hang'.",
    "2. Cột bắt buộc: Dự án, Hàng hóa, Kế hoạch.",
    "3. Dự án chưa tồn tại sẽ được tự động tạo từ Tên dự án, Đơn vị phụ trách, Mã TBMT và Địa điểm.",
    "4. Kế hoạch và Đã nhập phải là số nguyên không âm; Đã nhập không được vượt Kế hoạch.",
    "5. Ngày nhập dùng định dạng YYYY-MM-DD hoặc DD/MM/YYYY.",
    `6. Mỗi lần nhập tối đa ${MAX_ROWS} dòng; toàn bộ file sẽ không được ghi nếu có bất kỳ dòng lỗi nào.`,
  ].forEach((text) => guide.addRow([text]));
  guide.getRow(1).font = { bold: true, size: 14, color: { argb: "FF1D4ED8" } };
  return workbook.xlsx.writeBuffer();
}

function findHeaderRow(sheet) {
  for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, 10); rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const columns = new Map();
    row.eachCell((cell, column) => {
      const normalized = normalizeHeader(cell.text);
      const key = Object.entries(HEADER_ALIASES).find(([, aliases]) => aliases.includes(normalized))?.[0];
      if (key && !columns.has(key)) columns.set(key, column);
    });
    if (REQUIRED_HEADERS.every((key) => columns.has(key))) return { rowNumber, columns };
  }
  throw new ApiError(422, "Không tìm thấy hàng tiêu đề hợp lệ trong 10 hàng đầu tiên.");
}

function normalizeHeader(value) {
  return String(value || "").trim().toLocaleLowerCase("vi")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

function readCell(cell) {
  const value = cell.value;
  if (value == null) return "";
  if (value instanceof Date) return value;
  if (typeof value !== "object") return value;
  if ("result" in value) return value.result ?? "";
  if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join("");
  if ("text" in value) return value.text ?? "";
  return cell.text;
}

function asText(value) { return value == null ? "" : String(value).trim(); }

function numberOrRaw(value) {
  if (typeof value === "number") return value;
  const text = asText(value).replace(/\s/g, "").replace(/,/g, "");
  return text === "" ? null : Number(text);
}

function normalizeDate(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) return formatDate(value);
  if (typeof value === "number" && value > 20000) {
    return formatDate(new Date(Date.UTC(1899, 11, 30) + value * 86400000));
  }
  const text = asText(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return text;
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
