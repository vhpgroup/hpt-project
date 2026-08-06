"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Lỗi trả về từ API, kèm `details` để form hiển thị lỗi theo từng trường. */
export class RequestError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details || {};
  }
}

export async function api(path, { method = "GET", body, signal } = {}) {
  const response = await fetch(`/api${path}`, {
    method,
    signal,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new RequestError(
      payload.error || "Không thể kết nối máy chủ.",
      response.status,
      payload.details
    );
  }
  return payload;
}

export const qs = (params) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  }
  const str = search.toString();
  return str ? `?${str}` : "";
};

/**
 * Fetch có huỷ request cũ khi tham số đổi (tránh race condition khi gõ tìm kiếm)
 * và có `reload()` để làm mới sau khi ghi dữ liệu.
 */
export function useResource(path, { skip = false } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [nonce, setNonce] = useState(0);
  const isFirst = useRef(true);

  useEffect(() => {
    if (skip) return;
    const controller = new AbortController();
    // Chỉ hiện skeleton ở lần tải đầu; các lần lọc sau giữ nguyên dữ liệu cũ.
    if (isFirst.current) setLoading(true);

    api(path, { signal: controller.signal })
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err);
      })
      .finally(() => {
        isFirst.current = false;
        setLoading(false);
      });

    return () => controller.abort();
  }, [path, skip, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload };
}

/** Trì hoãn giá trị (dùng cho ô tìm kiếm) để không gọi API mỗi ký tự. */
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
