"use client";

import { useState } from "react";
import { Modal } from "./ui";

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

async function send(file, mode) {
  const form = new FormData();
  form.append("file", file);
  form.append("mode", mode);
  const response = await fetch("/api/import", { method: "POST", body: form });
  const body = await response.json();
  if (!response.ok) throw body;
  return body;
}

/**
 * Hai bước: đối chiếu trước (không ghi gì) rồi mới nhập, để người dùng thấy
 * số dòng trùng và chọn bỏ qua hay ghi đè.
 */
export default function ImportExcelDialog({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mode, setMode] = useState("skip");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => { setPreview(null); setError(null); };

  async function run(action) {
    if (!file) { setError({ message: "Vui lòng chọn file Excel." }); return; }
    setBusy(true);
    setError(null);
    try {
      if (action === "preview") setPreview(await send(file, "preview"));
      else onImported(await send(file, mode));
    } catch (err) {
      setError({ message: err?.error || "Không thể nhập file Excel.", rows: err?.details?.rows || [] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Nhập hàng hóa từ Excel"
      subtitle={preview ? "Bước 2 — kiểm tra trước khi ghi" : "Bước 1 — chọn file, tối đa 1.000 dòng"}
      onClose={busy ? () => {} : onClose}
      footer={
        <>
          <button className="button button-quiet" onClick={onClose} disabled={busy}>Hủy</button>
          {preview ? (
            <>
              <button className="button button-quiet" onClick={reset} disabled={busy}>Chọn lại</button>
              <button
                className="button button-primary"
                onClick={() => run("import")}
                disabled={busy || (preview.newRows === 0 && mode === "skip")}
              >
                {busy ? "Đang nhập…" : "Xác nhận nhập"}
              </button>
            </>
          ) : (
            <button className="button button-primary" onClick={() => run("preview")} disabled={busy || !file}>
              {busy ? "Đang kiểm tra…" : "Kiểm tra file"}
            </button>
          )}
        </>
      }
    >
      <div className="excel-import-form">
        <div className="import-help">
          <span className="import-help-icon" aria-hidden="true">XL</span>
          <div>
            <strong>Dự án và gói thầu chưa có sẽ được tự động tạo</strong>
            <p>
              Gói thầu nhận diện theo Mã TBMT, nếu trống thì theo tên gói trong cùng dự án.
              Nếu file có bất kỳ dòng lỗi nào, toàn bộ dữ liệu sẽ không được ghi.
            </p>
          </div>
        </div>

        <a className="template-link" href="/api/import" download>⇩ Tải file Excel mẫu</a>

        <label className={`upload-zone${file ? " has-file" : ""}`}>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => { setFile(event.target.files?.[0] || null); reset(); }}
            disabled={busy}
          />
          <span className="upload-icon" aria-hidden="true">⇧</span>
          {file ? (
            <span><strong>{file.name}</strong><small>{formatSize(file.size)} · Nhấn để chọn file khác</small></span>
          ) : (
            <span><strong>Chọn file Excel .xlsx</strong><small>Kích thước tối đa 5 MB</small></span>
          )}
        </label>

        {preview && (
          <div className="import-preview">
            <div className="preview-figures">
              <div><dt>Tổng dòng</dt><dd>{preview.total}</dd></div>
              <div><dt>Dòng mới</dt><dd className="ok">{preview.newRows}</dd></div>
              <div><dt>Đã tồn tại</dt><dd className={preview.duplicates ? "warn" : ""}>{preview.duplicates}</dd></div>
              <div><dt>Gói thầu mới</dt><dd>{preview.newPackages}</dd></div>
            </div>

            {preview.duplicates > 0 && (
              <>
                <p className="field-label">Xử lý {preview.duplicates} dòng đã tồn tại</p>
                <div className="mode-choice">
                  <label className={mode === "skip" ? "active" : ""}>
                    <input type="radio" name="mode" value="skip" checked={mode === "skip"} onChange={() => setMode("skip")} />
                    <span><strong>Bỏ qua</strong><small>Giữ nguyên dữ liệu hiện có</small></span>
                  </label>
                  <label className={mode === "replace" ? "active" : ""}>
                    <input type="radio" name="mode" value="replace" checked={mode === "replace"} onChange={() => setMode("replace")} />
                    <span><strong>Ghi đè</strong><small>Cập nhật kế hoạch, ĐVT, model theo file</small></span>
                  </label>
                </div>
                <ul className="dup-list">
                  {preview.duplicateRows.map((row) => (
                    <li key={`${row.row}-${row.name}`}>Dòng {row.row}: {row.name} <em>({row.package})</em></li>
                  ))}
                  {preview.duplicates > preview.duplicateRows.length && (
                    <li className="muted-note">… và {preview.duplicates - preview.duplicateRows.length} dòng khác</li>
                  )}
                </ul>
              </>
            )}

            {preview.duplicates === 0 && (
              <p className="receipt-done">✓ Không có dòng nào trùng với dữ liệu hiện có.</p>
            )}
          </div>
        )}

        {error && (
          <div className="import-error" role="alert">
            <strong>{error.message}</strong>
            {error.rows?.length > 0 && (
              <ul>
                {error.rows.slice(0, 8).map((row) => (
                  <li key={`${row.row}-${row.message}`}>Dòng {row.row}: {row.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
