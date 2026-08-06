"use client";

import { useState } from "react";
import { api, RequestError } from "@/lib/client";
import { Field, Modal } from "./ui";

export default function ProjectForm({ project, onClose, onSaved }) {
  const isEdit = Boolean(project);
  const [values, setValues] = useState({
    name: project?.name ?? "",
    location: project?.location ?? "",
    note: project?.note ?? "",
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
      subtitle={isEdit ? project.name : "Dự án là nơi nhóm các gói thầu của cùng một chủ đầu tư"}
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
        <Field label="Địa điểm" error={errors.location} wide>
          <input value={values.location} onChange={set("location")} placeholder="Hà Nội" />
        </Field>
        <Field label="Ghi chú" error={errors.note} wide>
          <textarea rows={2} value={values.note} onChange={set("note")} placeholder="Thông tin thêm về dự án…" />
        </Field>
      </form>
    </Modal>
  );
}
