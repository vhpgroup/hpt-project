import ExcelJS from "exceljs";
import { ApiError, validateItem, validatePackage, validateProject, validateReceipt } from "./domain.js";

const MAX_ROWS = 1000;

const HEADER_ALIASES = {
  projectName: ["du an", "ten du an", "project"],
  packageName: ["goi thau", "ten goi thau", "package"],
  owner: ["don vi", "don vi phu trach", "owner"],
  code: ["ma tbmt", "tbmt", "ma goi thau"],
  deadline: ["han giao hang", "han giao", "deadline"],
  contractValue: ["gia tri goi thau", "gia tri hop dong", "gia tri goi"],
  location: ["dia diem", "dia diem du an"],
  orderNo: ["stt", "thu tu"],
  name: ["hang hoa", "ten hang hoa", "danh muc hang hoa"],
  unit: ["dvt", "don vi tinh"],
  planQty: ["ke hoach", "so luong ke hoach", "khoi luong ke hoach"],
  unitPrice: ["don gia", "gia", "unit price"],
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
        location: asText(source.location),
      });
      const pkg = validatePackage({
        projectId: "excel-import",
        code: asText(source.code),
        name: asText(source.packageName),
        owner: asText(source.owner),
        location: asText(source.location),
        deadline: normalizeDate(source.deadline),
        contractValue: source.contractValue === "" || source.contractValue == null ? null : source.contractValue,
      });
      delete pkg.projectId;

      const item = validateItem({
        packageId: "excel-import",
        orderNo: asText(source.orderNo),
        name: asText(source.name),
        unit: asText(source.unit),
        planQty: numberOrRaw(source.planQty),
        unitPrice: source.unitPrice === "" || source.unitPrice == null ? 0 : source.unitPrice,
        model: asText(source.model),
        maker: asText(source.maker),
        note: asText(source.note),
      });
      delete item.packageId;

      // Cột "Đã nhập" trong file trở thành đợt nhập đầu tiên của dòng hàng.
      let receipt = null;
      const rawReceived = source.receivedQty;
      if (rawReceived !== "" && rawReceived != null) {
        receipt = validateReceipt({
          qty: numberOrRaw(rawReceived),
          receivedDate: normalizeDate(source.receivedDate),
        });
        if (receipt.qty > item.planQty) {
          throw new ApiError(422, "", { receivedQty: `Đã nhập (${receipt.qty}) vượt kế hoạch (${item.planQty}).` });
        }
      }

      rows.push({ project, package: pkg, item, receipt, rowNumber });
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
    { header: "Gói thầu", key: "packageName", width: 26 },
    { header: "Mã TBMT", key: "code", width: 18 },
    { header: "Đơn vị phụ trách", key: "owner", width: 20 },
    { header: "Địa điểm", key: "location", width: 18 },
    { header: "Hạn giao hàng", key: "deadline", width: 15 },
    { header: "Giá trị gói thầu", key: "contractValue", width: 18 },
    { header: "STT", key: "orderNo", width: 8 },
    { header: "Hàng hóa", key: "name", width: 34 },
    { header: "ĐVT", key: "unit", width: 12 },
    { header: "Kế hoạch", key: "planQty", width: 12 },
    { header: "Đơn giá", key: "unitPrice", width: 16 },
    { header: "Đã nhập", key: "receivedQty", width: 12 },
    { header: "Ngày nhập", key: "receivedDate", width: 14 },
    { header: "Ký mã hiệu", key: "model", width: 22 },
    { header: "Hãng SX", key: "maker", width: 18 },
    { header: "Ghi chú", key: "note", width: 28 },
  ];
  sheet.addRow({
    projectName: "Dự án mẫu", packageName: "Mua sắm thiết bị CNTT", code: "IB0000000000",
    owner: "HPT", location: "Hà Nội", deadline: "2026-12-31", contractValue: 250000000, orderNo: "1", unitPrice: 15000000, name: "Máy tính để bàn", unit: "Bộ", planQty: 10,
    receivedQty: 4, receivedDate: "2026-08-06", model: "MODEL-01", maker: "Dell",
    note: "Xóa dòng mẫu này trước khi nhập dữ liệu thật",
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: "R1" };
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
    "3. Dự án và gói thầu chưa tồn tại sẽ được tự động tạo.",
    "4. Gói thầu được nhận diện theo Mã TBMT; nếu bỏ trống thì theo Tên gói thầu trong cùng dự án.",
    "5. Mã TBMT phải có dạng IB + 10 chữ số, ví dụ IB2600343748.",
    "6. Kế hoạch và Đã nhập phải là số nguyên không âm; Đã nhập không được vượt Kế hoạch.",
    "7. Cột Đã nhập sẽ được ghi thành đợt nhập đầu tiên của dòng hàng.",
    "8. Ngày dùng định dạng YYYY-MM-DD hoặc DD/MM/YYYY.",
    "8b. Đơn giá và Giá trị gói thầu nhập bằng VND, có thể dùng dấu chấm phân cách (1.500.000).",
    "9. Dòng đã tồn tại (cùng gói thầu + STT + tên hàng) sẽ được bỏ qua hoặc ghi đè tùy lựa chọn khi nhập.",
    `10. Mỗi lần nhập tối đa ${MAX_ROWS} dòng; toàn bộ file sẽ không được ghi nếu có bất kỳ dòng lỗi nào.`,
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
