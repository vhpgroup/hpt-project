import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { ApiError } from "./domain.js";
import { runWithActor } from "./audit.js";

export const json = (body, status = 200) => NextResponse.json(body, { status });

/**
 * Bọc một route handler: bắt ApiError để trả về status đúng, và không để
 * lộ stack trace của lỗi ngoài dự kiến ra client.
 */
export function handler(fn) {
  return async (request, context) => {
    try {
      // Chưa có đăng nhập: lấy người thực hiện từ header để nhật ký có chủ thể.
      // Khi thêm xác thực chỉ cần đổi nguồn giá trị này.
      // Header HTTP truyền bằng ISO-8859-1, tên tiếng Việt phải giải mã lại UTF-8.
      const actor = decodeHeader(request.headers.get("x-actor"));
      return await runWithActor(actor, () => fn(request, context));
    } catch (err) {
      if (err instanceof ApiError) {
        return json({ error: err.message, details: err.details ?? null }, err.status);
      }
      if (err instanceof SyntaxError) {
        return json({ error: "Body không phải JSON hợp lệ." }, 400);
      }
      console.error("[api] unhandled error:", err);
      return json({ error: "Lỗi hệ thống, vui lòng thử lại." }, 500);
    }
  };
}

function decodeHeader(raw) {
  if (!raw) return null;
  try {
    return Buffer.from(raw, "latin1").toString("utf8");
  } catch {
    return raw;
  }
}

export async function readJson(request) {
  const text = await request.text();
  if (!text) return {};
  return JSON.parse(text);
}

export function searchParams(request) {
  const url = new URL(request.url);
  const get = (key) => url.searchParams.get(key) || undefined;
  return {
    q: get("q"),
    projectId: get("projectId"),
    packageId: get("packageId"),
    owner: get("owner"),
    status: get("status"),
    page: get("page"),
    pageSize: get("pageSize"),
  };
}
