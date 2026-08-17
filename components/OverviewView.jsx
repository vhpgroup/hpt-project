"use client";

import { useState } from "react";
import { qs, useDebounced, useResource } from "@/lib/client";
import { EmptyState, Pagination, ProgressBar, TableSkeleton, formatMoney } from "./ui";

export default function OverviewView({
  stats, statsLoading, refreshKey, onAddProject, onEditProject, onDeleteProject, onOpenPackages,
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search);

  const { data, loading } = useResource(
    `/projects${qs({ q: debouncedSearch, page, pageSize: 8, _: refreshKey })}`
  );
  const projects = data?.data ?? [];

  const metrics = [
    { key: "projectCount", label: "Dự án", tone: "indigo" },
    { key: "packageCount", label: "Gói thầu", tone: "slate" },
    { key: "itemCount", label: "Dòng hàng hóa", tone: "slate" },
    { key: "planValue", label: "Tổng giá trị", tone: "amber", money: true },
    { key: "completion", label: "Tiến độ toàn hệ thống", suffix: "%", tone: "green" },
  ];

  return (
    <>
      <div className="metric-grid">
        {metrics.map((metric) => (
          <article key={metric.key} className={`metric-card metric-${metric.tone}`}>
            <span className="metric-label">{metric.label}</span>
            <strong className="metric-value">
              {statsLoading
                ? <span className="skeleton-bar skeleton-inline" />
                : metric.money
                  ? <span title={`${formatMoney(stats?.[metric.key])} ₫`}>{formatMoney(stats?.[metric.key], { short: true })}</span>
                  : <>{(stats?.[metric.key] ?? 0).toLocaleString("vi-VN")}{metric.suffix ?? ""}</>}
            </strong>
            {metric.key === "completion" && !statsLoading && (
              <span className="metric-sub">
                {(stats?.receivedQty ?? 0).toLocaleString("vi-VN")} / {(stats?.planQty ?? 0).toLocaleString("vi-VN")} đã nhập
              </span>
            )}
            {metric.key === "planValue" && !statsLoading && (
              <span className="metric-sub">
                đã nhận {formatMoney(stats?.receivedValue, { short: true })} ₫
              </span>
            )}
            {metric.key === "packageCount" && !statsLoading && stats?.overdueCount > 0 && (
              <span className="metric-sub text-danger">{stats.overdueCount} gói trễ hạn</span>
            )}
          </article>
        ))}
      </div>

      <article className="panel">
        <div className="panel-head panel-head-wrap">
          <div><span className="kicker">Danh mục dự án</span><h3>Tiến độ theo dự án</h3></div>
          <div className="toolbar">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Tìm dự án, mã TBMT…"
                aria-label="Tìm dự án"
              />
            </label>
            <button className="button button-primary" onClick={onAddProject}>+ Thêm dự án</button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Dự án</th>
                <th>Đơn vị</th>
                <th className="num">Gói thầu</th>
                <th className="num">Dòng hàng</th>
                <th className="num">Giá trị</th>
                <th className="progress-col">Tiến độ</th>
                <th aria-label="Thao tác" />
              </tr>
            </thead>
            {loading ? (
              <TableSkeleton columns={7} />
            ) : (
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState title="Chưa có dự án nào" description="Thêm dự án rồi tạo gói thầu bên trong." />
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => (
                    <tr key={project.id}>
                      <td>
                        <strong>{project.name}</strong>
                        <span className="cell-sub">{project.location || "—"}</span>
                      </td>
                      <td>{project.owners.length ? project.owners.join(", ") : "—"}</td>
                      <td className="num">{project.packageCount}</td>
                      <td className="num">{project.itemCount}</td>
                      <td className="num">
                        <span title={`${formatMoney(project.planValue)} ₫`}>{formatMoney(project.planValue, { short: true })}</span>
                        <span className="cell-sub">{project.planQty.toLocaleString("vi-VN")} đơn vị</span>
                      </td>
                      <td className="progress-col"><ProgressBar value={project.completion} /></td>
                      <td className="row-actions">
                        <button className="icon-button" onClick={() => onOpenPackages(project)} aria-label={`Xem gói thầu của ${project.name}`} title="Xem gói thầu">▤</button>
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
