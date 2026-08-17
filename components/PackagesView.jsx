"use client";

import { useEffect, useState } from "react";
import { qs, useDebounced, useResource } from "@/lib/client";
import { EmptyState, Pagination, ProgressBar, TableSkeleton, formatMoney } from "./ui";

export default function PackagesView({
  projects, owners, pageSize, refreshKey, initialProjectId,
  onAddPackage, onEditPackage, onDeletePackage, onOpenItems,
}) {
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [owner, setOwner] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search);

  useEffect(() => {
    if (initialProjectId) {
      setProjectId(initialProjectId);
      setPage(1);
    }
  }, [initialProjectId]);

  const filters = { q: debouncedSearch, projectId, owner };
  const hasFilters = Object.values(filters).some(Boolean);
  const { data, loading } = useResource(`/packages${qs({ ...filters, page, pageSize, _: refreshKey })}`);
  const packages = data?.data ?? [];

  const update = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setProjectId("");
    setOwner("");
    setPage(1);
  };

  return (
    <article className="panel">
      <div className="panel-head panel-head-wrap">
        <div>
          <span className="kicker">Gói thầu</span>
          <h3>Danh sách gói thầu {data?.meta ? `(${data.meta.total})` : ""}</h3>
        </div>
        <div className="toolbar">
          <button className="button button-primary" onClick={onAddPackage} disabled={projects.length === 0}>
            + Thêm gói thầu
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <label className="search-box wide">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={search}
            onChange={update(setSearch)}
            placeholder="Tìm mã TBMT, tên gói, dự án…"
            aria-label="Tìm gói thầu"
          />
        </label>
        <select value={projectId} onChange={update(setProjectId)} aria-label="Lọc dự án">
          <option value="">Tất cả dự án</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={owner} onChange={update(setOwner)} aria-label="Lọc đơn vị">
          <option value="">Tất cả đơn vị</option>
          {owners.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <button className="button button-quiet" onClick={clearFilters} disabled={!hasFilters}>Xóa bộ lọc</button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Gói thầu</th>
              <th>Dự án</th>
              <th>Đơn vị</th>
              <th>Hạn giao</th>
              <th className="num">Dòng hàng</th>
              <th className="num">Giá trị</th>
              <th className="progress-col">Tiến độ</th>
              <th aria-label="Thao tác" />
            </tr>
          </thead>
          {loading ? (
            <TableSkeleton columns={8} />
          ) : (
            <tbody>
              {packages.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title={hasFilters ? "Không có gói thầu phù hợp" : "Chưa có gói thầu nào"}
                      description={hasFilters ? "Thử nới lỏng bộ lọc." : "Tạo gói thầu để bắt đầu khai báo hàng hóa."}
                      action={
                        hasFilters
                          ? <button className="button button-quiet" onClick={clearFilters}>Xóa bộ lọc</button>
                          : <button className="button button-primary" onClick={onAddPackage}>+ Thêm gói thầu</button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                packages.map((pkg) => {
                  const displayValue = pkg.contractValue ?? pkg.planValue ?? 0;
                  const receivedValue = pkg.receivedValue ?? 0;
                  const packageLabel = pkg.name || pkg.code || "Chưa có mã TBMT";

                  return (
                    <tr key={pkg.id}>
                      <td>
                        {pkg.name ? (
                          <>
                            <strong>{pkg.name}</strong>
                            <span className="cell-sub mono">{pkg.code || "Chưa có mã TBMT"}</span>
                          </>
                        ) : (
                          <strong className="mono">{pkg.code || "Chưa có mã TBMT"}</strong>
                        )}
                      </td>
                      <td>
                        {pkg.projectName}
                        <span className="cell-sub">{pkg.location || "—"}</span>
                      </td>
                      <td>{pkg.owner || "—"}</td>
                      <td>
                        {pkg.deadline ? (
                          <>
                            <span className="mono">{pkg.deadline}</span>
                            <span className={`cell-sub ${pkg.overdue ? "text-danger" : ""}`}>
                              {pkg.overdue
                                ? `Trễ ${Math.abs(pkg.daysToDeadline)} ngày`
                                : pkg.daysToDeadline >= 0
                                  ? `Còn ${pkg.daysToDeadline} ngày`
                                  : "Đã xong"}
                            </span>
                          </>
                        ) : "—"}
                      </td>
                      <td className="num">
                        {pkg.itemCount}
                        <span className="cell-sub">{pkg.done} xong</span>
                      </td>
                      <td className="num">
                        <span title={`${formatMoney(displayValue)} ₫`}>{formatMoney(displayValue)} ₫</span>
                        <span className="cell-sub mono">
                          {pkg.contractValue == null && pkg.planValue > 0 ? "theo đơn giá · " : ""}
                          đã nhận {formatMoney(receivedValue)} ₫
                        </span>
                      </td>
                      <td className="progress-col"><ProgressBar value={pkg.completion} /></td>
                      <td className="row-actions">
                        <button className="icon-button" onClick={() => onOpenItems(pkg)} aria-label={`Xem hàng hóa của ${packageLabel}`} title="Xem hàng hóa">▤</button>
                        <button className="icon-button" onClick={() => onEditPackage(pkg)} aria-label={`Sửa ${packageLabel}`}>✎</button>
                        <button className="icon-button danger" onClick={() => onDeletePackage(pkg)} aria-label={`Xóa ${packageLabel}`}>🗑</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          )}
        </table>
      </div>
      <Pagination meta={data?.meta} onChange={setPage} />
    </article>
  );
}
