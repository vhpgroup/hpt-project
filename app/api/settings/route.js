import { handler, json, readJson } from "@/lib/http";
import { readSettings, writeSettings } from "@/lib/db";
import { ApiError } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async () => json(readSettings()));

export const PUT = handler(async (request) => {
  const body = await readJson(request);
  const patch = {};

  if (body.systemName !== undefined) {
    const systemName = String(body.systemName).trim();
    if (!systemName) throw new ApiError(422, "Tên hệ thống không được để trống.");
    patch.systemName = systemName;
  }
  if (body.pageSize !== undefined) {
    const pageSize = Number(body.pageSize);
    if (!Number.isInteger(pageSize) || pageSize < 5 || pageSize > 100) {
      throw new ApiError(422, "Số dòng mỗi trang phải nằm trong khoảng 5–100.");
    }
    patch.pageSize = pageSize;
  }
  for (const key of ["owners", "units"]) {
    if (body[key] === undefined) continue;
    if (!Array.isArray(body[key])) throw new ApiError(422, `Trường ${key} phải là mảng.`);
    patch[key] = [...new Set(body[key].map((v) => String(v).trim()).filter(Boolean))];
  }

  return json(writeSettings(patch));
});
