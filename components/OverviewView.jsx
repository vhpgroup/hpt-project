"use client";

import { useState } from "react";
import { qs, useDebounced, useResource } from "@/lib/client";
import { EmptyState, Pagination, ProgressBar, TableSkeleton } from "./ui";

const METRICS = [
  { key: "projectCount", label: "Dự án đang theo dõi", suffix: "", tone: "indigo" },
  { key: "itemCount", label: "Dòng hàng hóa", suffix: "", tone: "slate" },
  { key: "planQty", label: "Tổng số lượng kế hoạch", suffix: "", tone: "slate" },
  { key: "completion", label: "Tiến độ toàn hệ thống", suffix: "%", tone: "green" },
];

const STATUS_ORDER = ["Hoàn thành", "Đang nhập", "Chưa nhập", "Chưa cập nhật"];
const STATUS_TONE = { "Hoàn thành": "ok", "Đang nhập": "warn", "Chưa nhập": "danger", "Chưa cập nhật": "muted" };

export default function OverviewView({ stats, statsLoading, owners, refreshKey, onEditProject, onDeleteProject, onAddProject }) {
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search);

  const query = qs({ q: debouncedSearch, owner, page, pageSize: 8, _: refreshKey });
  const { data, loading } = useResource(`/projects${query}`);
  const projects = data?.data ?? [];

  const resetPage = (fn) => (value) => { fn(value); setPage(1); };
  const totalStatus = STATUS_ORDER.reduce((sum, s) => sum + (stats?.byStatus?.[s] ?? 0), 0) || 1;

  return (
    <>
      <div className="metric-grid">
        {METRICS.map((metric) => (
          <article key={metric.key} className={`metric-card metric-${metric.tone}`}>
            <span className="metric-label">{metric.label}</span>
            <strong className="metric-value">
              {statsLoading ? <span className="skeleton-bar skeleton-inline" /> : (
                <>{(stats?.[metric.key] ?? 0).toLocaleString("vi-VN")}{metric.suffix}</>
              )}
            </strong>
            {metric.key === "completion" && !statsLoading && (
              <span className="metric-sub">
                {(stats?.receivedQty ?? 0).toLocaleString("vi-VN")} / {(stats?.planQty ?? 0).toLocaleString("vi-VN")} đã nhập
              </span>
            )}
          </article>
        ))}
      </div>

      <div className="overview-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <span className="kicker">Tình hình chung</span>
              <h3>Phân bố trạng thái</h3>
            </div>
            <span className="muted-note">Theo số dòng hàng hóa</span>
          </div>
          <div className="status-chart">
            {STATUS_ORDER.map((status) => {
              const count = stats?.byStatus?.[status] ?? 0;
              const percent = Math.round((count / totalStatus) * 100);
              return (
                <div key={status} className="status-row">
                  <span className="status-name">
                    <i className={`dot dot-${STATUS_TONE[status]}`} aria-hidden="true" />
                    {status}
                  </span>
                  <div className="status-track">
                    <div className={`status-fill fill-${STATUS_TONE[status]}`} style={{ width: `${percent}%` }} />
                  </div>
                  <span className="status-count">{count}</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <span className="kicker">Ưu tiên hôm nay</span>
              <h3>Dự án cần chú ý</h3>
            </div>
          </div>
          <div className="attention-list">
            {(stats?.attention ?? []).length === 0 ? (
              <EmptyState icon="✓" title="Không có điểm nghẽn" description="Mọi dự án đều đã hoàn tất nhập hàng." />
            ) : (
              stats.attention.map((project) => (
                <div key={project.id} className="attention-item">
                  <div className="attention-main">
                    <strong>{project.name}</strong>
                    <span className="muted-note">{project.owner || "Chưa gán đơn vị"} · {project.location || "—"}</span>
                  </div>
                  <div className="attention-tags">
                    {project.stale > 0 && <span className="badge badge-muted">{project.stale} chưa cập nhật</span>}
                    {project.notStarted > 0 && <span className="badge badge-danger">{project.notStarted} chưa nhập</span>}
                    {project.inProgress > 0 && <span className="badge badge-warn">{project.inProgress} đang nhập</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      <article className="panel">
        <div className="panel-head panel-head-wrap">
          <div>
            <span className="kicker">Danh mục dự án</span>
            <h3>Tiến độ theo dự án</h3>
          </div>
          <div className="toolbar">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={search}
                onChange={(e) => resetPage(setSearch)(e.target.value)}
                placeholder="Tìm dự án, gói thầu…"
                aria-label="Tìm dự án"
              />
            </label>
            <select value={owner} onChange={(e) => resetPage(setOwner)(e.target.value)} aria-label="Lọc đơn vị phụ trách">
              <option value="">Tất cả đơn vị</option>
              {owners.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <button className="button button-primary" onClick={onAddProject}>+ Thêm dự án</button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Dự án</th>
                <th>Đơn vị</th>
                <th className="num">Dòng hàng</th>
                <th className="num">Hoàn thành</th>
                <th className="num">Đang nhập</th>
                <th className="num">Chưa nhập</th>
                <th className="progress-col">Tiến độ</th>
                <th aria-label="Thao tác" />
              </tr>
            </thead>
            {loading ? (
              <TableSkeleton columns={8} />
            ) : (
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState title="Chưa có dự án nào" description="Thử đổi bộ lọc hoặc thêm dự án mới." />
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => (
                    <tr key={project.id}>
                      <td>
                        <strong>{project.name}</strong>
                        <span className="cell-sub">{project.bid || "—"} · {project.location || "—"}</span>
                      </td>
                      <td>{project.owner || "—"}</td>
                      <td className="num">{project.itemCount}</td>
                      <td className="num">{project.done}</td>
                      <td className="num">{project.inProgress}</td>
                      <td className="num">{project.notStarted + project.stale}</td>
                      <td className="progress-col"><ProgressBar value={project.completion} /></td>
                      <td className="row-actions">
                        <button className="icon-button" onClick={() => onEditProject(project)} aria-label={`Sửa ${project.name}`}>✎</button>
                        <button className="icon-button danger" onClick={() => onDeleteProject(project)} aria-label={`Xóa ${project.name}`}>🗑</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            )}
          </table>
        </div>
        <Pagination meta={data?.meta} onChange={setPage} />
      </article>
    </>
  );
}
