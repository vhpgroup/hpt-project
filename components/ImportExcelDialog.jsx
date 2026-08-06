"use client";

import { useState } from "react";
import { Modal } from "./ui";

export default function ImportExcelDialog({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    if (!file) { setError({ message: "Vui lòng chọn file Excel." }); return; }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/import", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw body;
      onImported(body);
    } catch (nextError) {
      setError({
        message: nextError?.error || "Không thể nhập file Excel.",
        rows: nextError?.details?.rows || [],
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Nhập hàng hóa từ Excel"
      subtitle="Tối đa 1.000 dòng mỗi lần nhập"
      onClose={busy ? () => {} : onClose}
      footer={
        <>
          <button className="button button-quiet" type="button" onClick={onClose} disabled={busy}>Hủy</button>
          <button className="button button-primary" type="submit" form="excel-import-form" disabled={busy || !file}>
            {busy ? "Đang nhập…" : "Nhập dữ liệu"}
          </button>
        </>
      }
    >
      <form id="excel-import-form" onSubmit={submit} className="excel-import-form">
        <div className="import-help">
          <span className="import-help-icon" aria-hidden="true">X</span>
          <div>
            <strong>Dùng đúng cấu trúc cột để nhập chính xác</strong>
            <p>Dự án chưa tồn tại sẽ được tự động tạo. Nếu file có dòng lỗi, toàn bộ dữ liệu sẽ không được ghi.</p>
          </div>
        </div>

        <a className="template-link" href="/api/import" download>
          ⇩ Tải file Excel mẫu
        </a>

        <label className={`upload-zone${file ? " has-file" : ""}`}>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => { setFile(event.target.files?.[0] || null); setError(null); }}
            disabled={busy}
          />
          <span className="upload-icon" aria-hidden="true">⇧</span>
          {file ? (
            <span><strong>{file.name}</strong><small>{formatSize(file.size)} · Nhấn để chọn file khác</small></span>
          ) : (
            <span><strong>Chọn file Excel .xlsx</strong><small>Kích thước tối đa 5 MB</small></span>
          )}
        </label>

        {error && (
          <div className="import-error" role="alert">
            <strong>{error.message}</strong>
            {error.rows?.length > 0 && (
              <ul>{error.rows.slice(0, 8).map((row) => <li key={`${row.row}-${row.message}`}>Dòng {row.row}: {row.message}</li>)}</ul>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
