import { NextResponse } from "next/server";
import { ApiError } from "./domain.js";

export const json = (body, status = 200) => NextResponse.json(body, { status });

/**
 * Bọc một route handler: bắt ApiError để trả về status đúng, và không để
 * lộ stack trace của lỗi ngoài dự kiến ra client.
 */
export function handler(fn) {
  return async (request, context) => {
    try {
      return await fn(request, context);
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
    owner: get("owner"),
    status: get("status"),
    page: get("page"),
    pageSize: get("pageSize"),
  };
}
