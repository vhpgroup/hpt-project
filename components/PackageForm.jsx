"use client";

import { useState } from "react";
import { api, RequestError } from "@/lib/client";
import { Field, Modal, MoneyInput } from "./ui";

export default function PackageForm({ pkg, projects, owners, defaultProjectId, onClose, onSaved }) {
  const isEdit = Boolean(pkg);
  const [values, setValues] = useState({
    projectId: pkg?.projectId ?? defaultProjectId ?? projects[0]?.id ?? "",
    code: pkg?.code ?? "",
    name: pkg?.name ?? "",
    owner: pkg?.owner ?? "",
    location: pkg?.location ?? "",
    deadline: pkg?.deadline ?? "",
    contractValue: pkg?.contractValue == null ? "" : String(pkg.contractValue),
    note: pkg?.note ?? "",
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
        deadline: values.deadline || null,
        contractValue: values.contractValue === "" ? null : Number(values.contractValue),
      };
      const saved = isEdit
        ? await api(`/packages/${pkg.id}`, { method: "PATCH", body: payload })
        : await api("/packages", { method: "POST", body: payload });
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
      title={isEdit ? "Cập nhật gói thầu" : "Thêm gói thầu"}
      subtitle={isEdit ? (pkg.code || pkg.name) : "Một dự án có thể gồm nhiều gói thầu"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button button-quiet" onClick={onClose} disabled={busy}>Hủy</button>
          <button type="submit" form="package-form" className="button button-primary" disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu"}
          </button>
        </>
      }
    >
      <form id="package-form" className="form-grid" onSubmit={submit} noValidate>
        {formError && <p className="form-alert">{formError}</p>}

        <Field label="Dự án" error={errors.projectId} wide>
          <select value={values.projectId} onChange={set("projectId")} required>
            <option value="">— Chọn dự án —</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>

        <Field label="Tên gói thầu" error={errors.name} wide>
          <input value={values.name} onChange={set("name")} placeholder="Mua sắm thiết bị CNTT" />
        </Field>

        <Field label="Mã TBMT" error={errors.code} hint="Dạng IB + 10 chữ số, để trống nếu chưa có">
          <input value={values.code} onChange={set("code")} placeholder="IB2600343748" />
        </Field>

        <Field label="Đơn vị phụ trách" error={errors.owner}>
          <input value={values.owner} onChange={set("owner")} list="owner-options" placeholder="HPT" />
          <datalist id="owner-options">
            {owners.map((o) => <option key={o} value={o} />)}
          </datalist>
        </Field>

        <Field label="Hạn giao hàng" error={errors.deadline} hint="Dùng để cảnh báo trễ tiến độ">
          <input type="date" value={values.deadline ?? ""} onChange={set("deadline")} />
        </Field>

        <Field label="Giá trị gói thầu" error={errors.contractValue} hint="Giá trúng thầu, đơn vị VND">
          <MoneyInput
            value={values.contractValue}
            onChange={(v) => {
              setValues((prev) => ({ ...prev, contractValue: v }));
              setErrors((prev) => (prev.contractValue ? { ...prev, contractValue: undefined } : prev));
            }}
          />
        </Field>

        <Field label="Địa điểm giao hàng" error={errors.location}>
          <input value={values.location} onChange={set("location")} placeholder="Hà Nội" />
        </Field>

        <Field label="Ghi chú" error={errors.note} wide>
          <textarea rows={2} value={values.note} onChange={set("note")} />
        </Field>
      </form>
    </Modal>
  );
}
