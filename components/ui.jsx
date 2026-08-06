"use client";

import { useEffect, useRef } from "react";

const STATUS_TONE = {
  "Hoàn thành": "ok",
  "Đang nhập": "warn",
  "Chưa nhập": "danger",
  "Chưa cập nhật": "muted",
};

export function StatusBadge({ status }) {
  return <span className={`badge badge-${STATUS_TONE[status] || "muted"}`}>{status}</span>;
}

export function ProgressBar({ value, label }) {
  const tone = value >= 100 ? "ok" : value > 0 ? "warn" : "danger";
  return (
    <div className="progress" role="img" aria-label={label ?? `Tiến độ ${value}%`}>
      <div className="progress-track">
        <div className={`progress-fill progress-${tone}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="progress-value">{value}%</span>
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, footer, wide = false }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector("input, select, textarea, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`modal${wide ? " modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={dialogRef}
      >
        <header className="modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Đóng">✕</button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function Field({ label, error, hint, children, wide = false }) {
  return (
    <label className={`field${wide ? " field-wide" : ""}${error ? " field-error" : ""}`}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-message">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function Pagination({ meta, onChange }) {
  if (!meta || meta.pageCount <= 1) return null;
  const { page, pageCount, total, pageSize } = meta;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages = [];
  for (let i = 1; i <= pageCount; i += 1) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages.at(-1) !== "…") pages.push("…");
  }

  return (
    <nav className="pagination" aria-label="Phân trang">
      <span className="pagination-info">
        {from}–{to} trên {total}
      </span>
      <div className="pagination-controls">
        <button className="page-button" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</button>
        {pages.map((p, index) =>
          p === "…" ? (
            <span key={`gap-${index}`} className="page-gap">…</span>
          ) : (
            <button
              key={p}
              className={`page-button${p === page ? " active" : ""}`}
              aria-current={p === page ? "page" : undefined}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          )
        )}
        <button className="page-button" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>›</button>
      </div>
    </nav>
  );
}

export function EmptyState({ icon = "◍", title, description, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true">{icon}</span>
      <h4>{title}</h4>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 6 }) {
  return (
    <tbody className="skeleton-body">
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r}>
          {Array.from({ length: columns }, (_, c) => (
            <td key={c}><span className="skeleton-bar" /></td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.tone || "ok"}`} role="status" aria-live="polite">
      <span>{toast.message}</span>
      <button className="icon-button" onClick={onDismiss} aria-label="Đóng thông báo">✕</button>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Xác nhận", busy, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="button button-quiet" onClick={onCancel} disabled={busy}>Hủy</button>
          <button className="button button-danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Đang xử lý…" : confirmLabel}
          </button>
        </>
      }
    >
      <p className="confirm-message">{message}</p>
    </Modal>
  );
}
