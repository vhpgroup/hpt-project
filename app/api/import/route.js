import { Buffer } from "node:buffer";
import { ApiError } from "@/lib/domain";
import { createImportTemplate, parseImportWorkbook } from "@/lib/excel";
import { handler, json } from "@/lib/http";
import { importItems, previewImport } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const GET = handler(async () => {
  const buffer = await createImportTemplate();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-nhap-hang-hoa.xlsx"',
      "Cache-Control": "no-store",
    },
  });
});

/**
 * `mode`:
 *   - "preview": chỉ đối chiếu và trả về thống kê, không ghi gì
 *   - "skip" (mặc định): bỏ qua dòng đã tồn tại
 *   - "replace": ghi đè dòng đã tồn tại
 */
export const POST = handler(async (request) => {
  const form = await request.formData();
  const file = form.get("file");
  const mode = String(form.get("mode") || "skip");

  if (!file || typeof file.arrayBuffer !== "function") {
    throw new ApiError(400, "Vui lòng chọn file Excel để nhập.");
  }
  if (file.size > MAX_FILE_SIZE) throw new ApiError(413, "File Excel tối đa 5 MB.");
  if (!/\.xlsx$/i.test(file.name || "")) throw new ApiError(422, "Chỉ hỗ trợ file .xlsx.");
  if (!["preview", "skip", "replace"].includes(mode)) {
    throw new ApiError(400, "Chế độ nhập không hợp lệ.");
  }

  const rows = await parseImportWorkbook(Buffer.from(await file.arrayBuffer()));

  if (mode === "preview") return json(previewImport(rows));
  return json(importItems(rows, { mode }), 201);
});
