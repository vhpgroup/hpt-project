"use client";

import { useState } from "react";
import { api, RequestError } from "@/lib/client";
import { Field, Modal, MoneyInput, formatMoney } from "./ui";

export default function ItemForm({ item, packages, units, defaultPackageId, onClose, onSaved }) {
  const isEdit = Boolean(item);
  const [values, setValues] = useState({
    packageId: item?.packageId ?? defaultPackageId ?? packages[0]?.id ?? "",
    orderNo: item?.orderNo ?? "",
    name: item?.name ?? "",
    unit: item?.unit ?? "",
    planQty: item ? String(item.planQty) : "",
    unitPrice: item ? String(item.unitPrice ?? 0) : "",
    model: item?.model ?? "",
    maker: item?.maker ?? "",
    note: item?.note ?? "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (key) => (event) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const payload = {
        ...values,
        planQty: values.planQty === "" ? 0 : Number(values.planQty),
        unitPrice: values.unitPrice === "" ? 0 : Number(values.unitPrice),
      };
      const saved = isEdit
        ? await api(`/items/${item.id}`, { method: "PATCH", body: payload })
        : await api("/items", { method: "POST", body: payload });
      onSaved(saved, isEdit);
    } catch (err) {
      if (err instanceof RequestError && Object.keys(err.details).length) setErrors(err.details);
      else setFormError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      wide
      title={isEdit ? "Cập nhật hàng hóa" : "Thêm hàng hóa"}
      subtitle={isEdit ? item.name : "Khai báo một dòng hàng thuộc gói thầu"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button button-quiet" onClick={onClose} disabled={busy}>Hủy</button>
          <button type="submit" form="item-form" className="button button-primary" disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu"}
          </button>
        </>
      }
    >
      <form id="item-form" className="form-grid" onSubmit={submit} noValidate>
        {formError && <p className="form-alert">{formError}</p>}

        <Field label="Gói thầu" error={errors.packageId} wide>
          <select value={values.packageId} onChange={set("packageId")} required>
            <option value="">— Chọn gói thầu —</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {[p.code, p.name].filter(Boolean).join(" · ")} — {p.projectName}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tên hàng hóa" error={errors.name} wide>
          <input value={values.name} onChange={set("name")} placeholder="Máy tính để bàn Dell" required />
        </Field>

        <Field label="STT trong gói" error={errors.orderNo}>
          <input value={values.orderNo} onChange={set("orderNo")} inputMode="numeric" placeholder="1" />
        </Field>

        <Field label="Đơn vị tính" error={errors.unit}>
          <input value={values.unit} onChange={set("unit")} list="unit-options" placeholder="Bộ" />
          <datalist id="unit-options">
            {units.map((u) => <option key={u} value={u} />)}
          </datalist>
        </Field>

        <Field
          label="Số lượng kế hoạch"
          error={errors.planQty}
          hint={isEdit ? `Đã nhập ${item.receivedQty} — không thể hạ thấp hơn` : undefined}
        >
          <input type="number" min="0" value={values.planQty} onChange={set("planQty")} required />
        </Field>

        <Field label="Đơn giá" error={errors.unitPrice} hint="VND, để trống nếu chưa có giá">
          <MoneyInput
            value={values.unitPrice}
            onChange={(v) => {
              setValues((prev) => ({ ...prev, unitPrice: v }));
              setErrors((prev) => (prev.unitPrice ? { ...prev, unitPrice: undefined } : prev));
            }}
          />
        </Field>

        <Field label="Thành tiền">
          <output className="amount-output">
            {formatMoney((Number(values.planQty) || 0) * (Number(values.unitPrice) || 0))} ₫
          </output>
        </Field>

        <Field label="Hãng sản xuất" error={errors.maker}>
          <input value={values.maker} onChange={set("maker")} placeholder="Dell" />
        </Field>

        <Field label="Model / Ký mã hiệu" error={errors.model} wide>
          <input value={values.model} onChange={set("model")} placeholder="OptiPlex 7020 SFF" />
        </Field>

        <Field label="Ghi chú" error={errors.note} wide>
          <textarea rows={2} value={values.note} onChange={set("note")} />
        </Field>

        {isEdit && (
          <p className="form-hint-block">
            Số lượng đã nhập được quản lý qua <strong>các đợt nhập</strong> — mở bảng đợt nhập của dòng hàng để ghi nhận.
          </p>
        )}
      </form>
    </Modal>
  );
}
