"use client";

import { useState } from "react";
import { api, RequestError } from "@/lib/client";
import { Field, Modal } from "./ui";

export default function ProjectForm({ project, owners, onClose, onSaved }) {
  const isEdit = Boolean(project);
  const [values, setValues] = useState({
    name: project?.name ?? "",
    owner: project?.owner ?? "",
    bid: project?.bid ?? "",
    location: project?.location ?? "",
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
      const saved = isEdit
        ? await api(`/projects/${project.id}`, { method: "PATCH", body: values })
        : await api("/projects", { method: "POST", body: values });
      onSaved(saved, isEdit);
    } catch (err) {
      if (err instanceof RequestError && Object.keys(err.details).length) setErrors(err.details);
      else setFormError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title={isEdit ? "Cập nhật dự án" : "Thêm dự án"}
      subtitle={isEdit ? project.name : "Tạo mới một dự án nhập hàng"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button button-quiet" onClick={onClose} disabled={busy}>Hủy</button>
          <button type="submit" form="project-form" className="button button-primary" disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu"}
          </button>
        </>
      }
    >
      <form id="project-form" className="form-grid" onSubmit={submit} noValidate>
        {formError && <p className="form-alert">{formError}</p>}

        <Field label="Tên dự án" error={errors.name} wide>
          <input value={values.name} onChange={set("name")} placeholder="Bệnh viện Đa khoa …" required />
        </Field>

        <Field label="Đơn vị phụ trách" error={errors.owner}>
          <input value={values.owner} onChange={set("owner")} list="owner-options" placeholder="HPT" />
          <datalist id="owner-options">
            {owners.map((o) => <option key={o} value={o} />)}
          </datalist>
        </Field>

        <Field label="Mã gói thầu" error={errors.bid}>
          <input value={values.bid} onChange={set("bid")} placeholder="IB2600343748" />
        </Field>

        <Field label="Địa điểm" error={errors.location} wide>
          <input value={values.location} onChange={set("location")} placeholder="Hà Nội" />
        </Field>
      </form>
    </Modal>
  );
}
