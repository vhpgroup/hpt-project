"use client";

import { useState } from "react";
import { api, RequestError } from "@/lib/client";
import { Field, Modal } from "./ui";

const blank = {
  projectId: "", orderNo: "", name: "", unit: "", planQty: "",
  receivedQty: "", receivedDate: "", model: "", maker: "", note: "",
};

export default function ItemForm({ item, projects, units, onClose, onSaved }) {
  const isEdit = Boolean(item);
  const [values, setValues] = useState(() =>
    item
      ? {
          projectId: item.projectId,
          orderNo: item.orderNo ?? "",
          name: item.name ?? "",
          unit: item.unit ?? "",
          planQty: String(item.planQty ?? ""),
          receivedQty: item.receivedQty === null ? "" : String(item.receivedQty),
          receivedDate: item.receivedDate ?? "",
          model: item.model ?? "",
          maker: item.maker ?? "",
          note: item.note ?? "",
        }
      : { ...blank, projectId: projects[0]?.id ?? "" }
  );
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
        receivedQty: values.receivedQty === "" ? null : Number(values.receivedQty),
        receivedDate: values.receivedDate || null,
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
      subtitle={isEdit ? item.name : "Khai báo một dòng hàng thuộc dự án"}
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

        <Field label="Dự án" error={errors.projectId} wide>
          <select value={values.projectId} onChange={set("projectId")} required>
            <option value="">— Chọn dự án —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Tên hàng hóa" error={errors.name} wide>
          <input value={values.name} onChange={set("name")} placeholder="Ví dụ: Máy tính để bàn Dell" required />
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

        <Field label="Số lượng kế hoạch" error={errors.planQty}>
          <input type="number" min="0" value={values.planQty} onChange={set("planQty")} required />
        </Field>

        <Field
          label="Số lượng đã nhập"
          error={errors.receivedQty}
          hint="Để trống nếu chưa cập nhật"
        >
          <input type="number" min="0" value={values.receivedQty} onChange={set("receivedQty")} />
        </Field>

        <Field label="Ngày nhập gần nhất" error={errors.receivedDate}>
          <input type="date" value={values.receivedDate} onChange={set("receivedDate")} />
        </Field>

        <Field label="Hãng sản xuất" error={errors.maker}>
          <input value={values.maker} onChange={set("maker")} placeholder="Dell" />
        </Field>

        <Field label="Model / Mã hiệu" error={errors.model} wide>
          <input value={values.model} onChange={set("model")} placeholder="OptiPlex 7020 SFF" />
        </Field>

        <Field label="Ghi chú" error={errors.note} wide>
          <textarea rows={2} value={values.note} onChange={set("note")} placeholder="Thông tin thêm về lô hàng…" />
        </Field>
      </form>
    </Modal>
  );
}
