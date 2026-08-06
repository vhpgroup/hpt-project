"use client";

import { useState } from "react";
import { api, RequestError, useResource } from "@/lib/client";
import { Field, Modal, ProgressBar, StatusBadge } from "./ui";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Lịch sử nhập hàng theo đợt của một dòng hàng. Tổng các đợt chính là số lượng
 * đã nhập — không có ô "đã nhập" nào để sửa tay, nên số liệu luôn truy vết được.
 */
export default function ReceiptsPanel({ item: initialItem, onClose, onChanged }) {
  const [item, setItem] = useState(initialItem);
  const { data, loading, reload } = useResource(`/items/${item.id}/receipts`);
  const receipts = data?.data ?? [];

  const [qty, setQty] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const refresh = (nextItem) => {
    setItem(nextItem);
    reload();
    onChanged?.();
  };

  async function addReceipt(event) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      const result = await api(`/items/${item.id}/receipts`, {
        method: "POST",
        body: { qty: qty === "" ? 0 : Number(qty), receivedDate: date || null, note },
      });
      setQty("");
      setNote("");
      refresh(result.item);
    } catch (err) {
      if (err instanceof RequestError && Object.keys(err.details).length) setErrors(err.details);
      else setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeReceipt(id) {
    setRemovingId(id);
    try {
      refresh(await api(`/receipts/${id}`, { method: "DELETE" }));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setRemovingId(null);
    }
  }

  const remaining = item.remainingQty;

  return (
    <Modal
      wide
      title="Đợt nhập hàng"
      subtitle={item.name}
      onClose={onClose}
      footer={<button className="button button-quiet" onClick={onClose}>Đóng</button>}
    >
      <div className="receipt-summary">
        <div>
          <span className="field-label">Tiến độ</span>
          <ProgressBar value={item.completion} />
        </div>
        <dl className="receipt-figures">
          <div><dt>Kế hoạch</dt><dd>{item.planQty} {item.unit}</dd></div>
          <div><dt>Đã nhập</dt><dd className="ok">{item.receivedQty}</dd></div>
          <div><dt>Còn lại</dt><dd className={remaining > 0 ? "warn" : ""}>{remaining}</dd></div>
          <div><dt>Trạng thái</dt><dd><StatusBadge status={item.status} /></dd></div>
        </dl>
      </div>

      {remaining === 0 && item.receiptCount > 0 ? (
        <p className="receipt-done">✓ Đã nhập đủ số lượng theo kế hoạch.</p>
      ) : (
        <form className="receipt-form" onSubmit={addReceipt} noValidate>
          <Field label="Số lượng đợt này" error={errors.qty} hint={`Tối đa ${remaining}`}>
            <input
              type="number"
              min="0"
              max={remaining}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
              required
            />
          </Field>
          <Field label="Ngày nhập" error={errors.receivedDate}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Ghi chú" error={errors.note}>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Số phiếu, nhà cung cấp…" />
          </Field>
          <button className="button button-primary receipt-submit" disabled={busy}>
            {busy ? "Đang ghi…" : "+ Ghi nhận"}
          </button>
        </form>
      )}

      <p className="field-hint receipt-tip">
        Ghi nhận <strong>0</strong> để đánh dấu &quot;đã kiểm tra, hàng chưa về&quot; — khác với chưa ai cập nhật.
      </p>

      {formError && <p className="form-alert">{formError}</p>}

      <div className="receipt-list">
        <span className="field-label">Lịch sử {receipts.length > 0 && `(${receipts.length} đợt)`}</span>
        {loading ? (
          <p className="muted-note">Đang tải…</p>
        ) : receipts.length === 0 ? (
          <p className="muted-note">Chưa có đợt nhập nào được ghi nhận.</p>
        ) : (
          <ol className="receipt-timeline">
            {receipts.map((receipt) => (
              <li key={receipt.id}>
                <span className={`receipt-qty${receipt.qty === 0 ? " zero" : ""}`}>
                  {receipt.qty > 0 ? `+${receipt.qty}` : "0"}
                </span>
                <span className="receipt-body">
                  <strong>{receipt.receivedDate || "Không rõ ngày"}</strong>
                  {receipt.note && <span className="cell-sub">{receipt.note}</span>}
                </span>
                <button
                  className="icon-button danger"
                  onClick={() => removeReceipt(receipt.id)}
                  disabled={removingId === receipt.id}
                  aria-label="Xóa đợt nhập"
                >
                  {removingId === receipt.id ? "…" : "🗑"}
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Modal>
  );
}
