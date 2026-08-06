"use client";

import { useState } from "react";
import { qs, useResource } from "@/lib/client";
import { EmptyState, Pagination, formatMoney } from "./ui";

const ENTITY_OPTIONS = [
  { value: "", label: "Tất cả đối tượng" },
  { value: "project", label: "Dự án" },
  { value: "package", label: "Gói thầu" },
  { value: "item", label: "Hàng hóa" },
  { value: "receipt", label: "Đợt nhập" },
];

const ACTION_TONE = { create: "ok", update: "warn", delete: "danger" };
const ACTION_ICON = { create: "+", update: "✎", delete: "🗑" };

const formatValue = (value, money) => {
  if (value === null || value === undefined || value === "") return "(trống)";
  return money ? `${formatMoney(value)} ₫` : String(value);
};

function formatTime(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AuditView({ pageSize, refreshKey }) {
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);

  const { data, loading } = useResource(
    `/audit${qs({ entityType, page, pageSize: pageSize ?? 20, _: refreshKey })}`
  );
  const entries = data?.data ?? [];

  return (
    <article className="panel">
      <div className="panel-head panel-head-wrap">
        <div>
          <span className="kicker">Nhật ký</span>
          <h3>Lịch sử thay đổi {data?.meta ? `(${data.meta.total})` : ""}</h3>
        </div>
        <div className="toolbar">
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            aria-label="Lọc theo đối tượng"
          >
            {ENTITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="audit-list">
        {loading ? (
          <p className="muted-note audit-loading">Đang tải…</p>
        ) : entries.length === 0 ? (
          <EmptyState
            title="Chưa có thay đổi nào"
            description="Mọi thao tác thêm, sửa, xóa sẽ được ghi lại ở đây."
          />
        ) : (
          entries.map((entry) => (
            <article key={entry.id} className="audit-entry">
              <span className={`audit-action audit-${ACTION_TONE[entry.action] || "muted"}`} aria-hidden="true">
                {ACTION_ICON[entry.action] || "•"}
              </span>

              <div className="audit-body">
                <p className="audit-headline">
                  <strong>{entry.actionLabel}</strong>
                  <span className="badge badge-muted">{entry.entityTypeLabel}</span>
                  <span className="audit-target">{entry.entityLabel || "(không tên)"}</span>
                  {entry.parentLabel && <span className="audit-parent">trong {entry.parentLabel}</span>}
                </p>

                {entry.changes.length > 0 && (
                  <ul className="audit-changes">
                    {entry.changes.map((change) => (
                      <li key={change.field}>
                        <span className="audit-field">{change.label}</span>
                        {entry.action === "create" ? (
                          <span className="audit-to">{formatValue(change.after, change.money)}</span>
                        ) : (
                          <>
                            <span className="audit-from">{formatValue(change.before, change.money)}</span>
                            <span className="audit-arrow" aria-label="thành">→</span>
                            <span className="audit-to">{formatValue(change.after, change.money)}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="audit-meta">
                <span>{entry.actor}</span>
                <time dateTime={entry.createdAt}>{formatTime(entry.createdAt)}</time>
              </div>
            </article>
          ))
        )}
      </div>

      <Pagination meta={data?.meta} onChange={setPage} />
    </article>
  );
}
