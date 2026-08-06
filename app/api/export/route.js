import { handler, searchParams } from "@/lib/http";
import { listAllItemsForExport } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS = [
  ["Dự án", (i) => i.projectName],
  ["Gói thầu", (i) => i.packageName],
  ["Mã TBMT", (i) => i.packageCode],
  ["Đơn vị", (i) => i.owner],
  ["Hạn giao hàng", (i) => i.deadline ?? ""],
  ["STT", (i) => i.orderNo],
  ["Tên hàng hóa", (i) => i.name],
  ["Model / Mã hiệu", (i) => i.model],
  ["Hãng sản xuất", (i) => i.maker],
  ["ĐVT", (i) => i.unit],
  ["Kế hoạch", (i) => i.planQty],
  ["Đã nhập", (i) => i.receivedQty],
  ["Còn lại", (i) => i.remainingQty],
  ["Số đợt nhập", (i) => i.receiptCount],
  ["Tiến độ (%)", (i) => i.completion],
  ["Trạng thái", (i) => i.status],
  ["Ngày nhập gần nhất", (i) => i.receivedDate ?? ""],
  ["Địa điểm", (i) => i.location],
  ["Ghi chú", (i) => i.note],
];

const escapeCsv = (value) => {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n;]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

export const GET = handler(async (request) => {
  const items = listAllItemsForExport(searchParams(request));
  const rows = [
    COLUMNS.map(([label]) => label).join(","),
    ...items.map((item) => COLUMNS.map(([, pick]) => escapeCsv(pick(item))).join(",")),
  ];

  // BOM để Excel trên Windows nhận đúng UTF-8 tiếng Việt.
  const csv = "﻿" + rows.join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nhap-hang-${stamp}.csv"`,
    },
  });
});
