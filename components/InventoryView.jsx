"use client";

import { useEffect, useState } from "react";
import { qs, useDebounced, useResource } from "@/lib/client";
import { EmptyState, Pagination, ProgressBar, StatusBadge, TableSkeleton, formatMoney } from "./ui";

const STATUSES = ["Hoàn thành", "Đang nhập", "Chưa nhập", "Chưa cập nhật"];

export default function InventoryView({
  packages, owners, pageSize, refreshKey, initialPackageId,
  onEditItem, onDeleteItem, onAddItem, onImportExcel, onOpenReceipts,
}) {
  const [search, setSearch] = useState("");
  const [packageId, setPackageId] = useState(initialPackageId ?? "");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search);

  // Khi mở từ màn Gói thầu, lọc sẵn theo gói đó.
  useEffect(() => {
    if (initialPackageId) { setPackageId(initialPackageId); setPage(1); }
  }, [initialPackageId]);

  const filters = { q: debouncedSearch, packageId, owner, status };
  const hasFilters = Object.values(filters).some(Boolean);
  const { data, loading } = useResource(`/items${qs({ ...filters, page, pageSize, _: refreshKey })}`);
  const items = data?.data ?? [];

  const update = (setter) => (event) => { setter(event.target.value); setPage(1); };
  const clearFilters = () => {
    setSearch(""); setPackageId(""); setOwner(""); setStatus(""); setPage(1);
  };

  return (
    <article className="panel">
      <div className="panel-head panel-head-wrap">
        <div>
          <span className="kicker">Danh mục hàng hóa</span>
          <h3>Toàn bộ dòng hàng {data?.meta ? `(${data.meta.total})` : ""}</h3>
        </div>
        <div className="toolbar">
          <button className="button button-quiet" onClick={onImportExcel}>⇧ Nhập Excel</button>
          <a className="button button-quiet" href={`/api/export${qs(filters)}`} download>⇩ Xuất CSV</a>
          <button className="button button-primary" onClick={onAddItem} disabled={packages.length === 0}>
            + Thêm hàng hóa
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
            placeholder="Tìm hàng hóa, model, hãng SX, mã TBMT…"
            aria-label="Tìm hàng hóa"
          />
        </label>
        <select value={packageId} onChange={update(setPackageId)} aria-label="Lọc gói thầu">
          <option value="">Tất cả gói thầu</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {[p.code, p.name].filter(Boolean).join(" · ")}
            </option>
          ))}
        </select>
        <select value={owner} onChange={update(setOwner)} aria-label="Lọc đơn vị">
          <option value="">Tất cả đơn vị</option>
          {owners.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={status} onChange={update(setStatus)} aria-label="Lọc trạng thái">
          <option value="">Tất cả trạng thái</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="button button-quiet" onClick={clearFilters} disabled={!hasFilters}>Xóa bộ lọc</button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Hàng hóa</th>
              <th>Gói thầu</th>
              <th className="num">KH</th>
              <th className="num">Đã nhập</th>
              <th className="num">Còn lại</th>
              <th className="num">Thành tiền</th>
              <th className="progress-col">Tiến độ</th>
              <th>Trạng thái</th>
              <th aria-label="Thao tác" />
            </tr>
          </thead>
          {loading ? (
            <TableSkeleton columns={9} rows={6} />
          ) : (
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      title={hasFilters ? "Không có kết quả phù hợp" : "Chưa có hàng hóa nào"}
                      description={hasFilters ? "Thử nới lỏng bộ lọc." : "Thêm dòng hàng đầu tiên để bắt đầu theo dõi."}
                      action={
                        hasFilters
                          ? <button className="button button-quiet" onClick={clearFilters}>Xóa bộ lọc</button>
                          : <button className="button button-primary" onClick={onAddItem}>+ Thêm hàng hóa</button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <span className="cell-sub">
                        {[item.maker, item.model].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </td>
                    <td>
                      {item.packageName || "(chưa đặt tên)"}
                      <span className="cell-sub mono">{item.packageCode || item.projectName}</span>
                    </td>
                    <td className="num">{item.planQty} <small>{item.unit}</small></td>
                    <td className="num">
                      {item.receivedQty}
                      {item.receiptCount > 0 && <span className="cell-sub">{item.receiptCount} đợt</span>}
                    </td>
                    <td className="num">{item.remainingQty}</td>
                    <td className="num">
                      {item.unitPrice > 0
                        ? <span title={`${formatMoney(item.amount)} ₫`}>{formatMoney(item.amount, { short: true })}</span>
                        : "—"}
                      {item.unitPrice > 0 && (
                        <span className="cell-sub">@{formatMoney(item.unitPrice, { short: true })}</span>
                      )}
                    </td>
                    <td className="progress-col"><ProgressBar value={item.completion} /></td>
                    <td><StatusBadge status={item.status} /></td>
                    <td className="row-actions">
                      <button
                        className="icon-button accent"
                        onClick={() => onOpenReceipts(item)}
                        aria-label={`Ghi nhận đợt nhập cho ${item.name}`}
                        title="Đợt nhập hàng"
                      >
                        ⇧
                      </button>
                      <button className="icon-button" onClick={() => onEditItem(item)} aria-label={`Sửa ${item.name}`}>✎</button>
                      <button className="icon-button danger" onClick={() => onDeleteItem(item)} aria-label={`Xóa ${item.name}`}>🗑</button>
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
  );
}
