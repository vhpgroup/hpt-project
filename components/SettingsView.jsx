"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { Field } from "./ui";

function TagEditor({ label, hint, values, onChange }) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    if (!value || values.includes(value)) return setDraft("");
    onChange([...values, value]);
    setDraft("");
  };

  return (
    <div className="tag-editor">
      <span className="field-label">{label}</span>
      <div className="tag-list">
        {values.length === 0 && <span className="muted-note">Chưa có mục nào.</span>}
        {values.map((value) => (
          <span key={value} className="tag">
            {value}
            <button
              type="button"
              className="tag-remove"
              onClick={() => onChange(values.filter((v) => v !== value))}
              aria-label={`Xóa ${value}`}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="tag-input">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(); }
          }}
          placeholder="Nhập rồi bấm Enter…"
        />
        <button type="button" className="button button-quiet" onClick={add}>Thêm</button>
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

export default function SettingsView({ settings, onSaved, onToast }) {
  const [values, setValues] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const dirty = JSON.stringify(values) !== JSON.stringify(settings);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const saved = await api("/settings", { method: "PUT", body: values });
      onSaved(saved);
      onToast({ message: "Đã lưu cài đặt.", tone: "ok" });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel settings-panel" onSubmit={submit}>
      <div className="panel-head">
        <div>
          <span className="kicker">Hệ thống</span>
          <h3>Cài đặt chung</h3>
        </div>
      </div>

      {error && <p className="form-alert">{error}</p>}

      <div className="form-grid">
        <Field label="Tên hệ thống" wide>
          <input
            value={values.systemName}
            onChange={(e) => setValues((v) => ({ ...v, systemName: e.target.value }))}
            required
          />
        </Field>

        <Field label="Số dòng mỗi trang" hint="Từ 5 đến 100">
          <input
            type="number"
            min="5"
            max="100"
            value={values.pageSize}
            onChange={(e) => setValues((v) => ({ ...v, pageSize: Number(e.target.value) }))}
          />
        </Field>
      </div>

      <div className="settings-columns">
        <TagEditor
          label="Đơn vị phụ trách"
          hint="Gợi ý khi tạo dự án mới."
          values={values.owners}
          onChange={(owners) => setValues((v) => ({ ...v, owners }))}
        />
        <TagEditor
          label="Đơn vị tính"
          hint="Gợi ý khi khai báo hàng hóa."
          values={values.units}
          onChange={(units) => setValues((v) => ({ ...v, units }))}
        />
      </div>

      <div className="settings-actions">
        <button type="button" className="button button-quiet" onClick={() => setValues(settings)} disabled={!dirty || busy}>
          Hoàn tác
        </button>
        <button type="submit" className="button button-primary" disabled={!dirty || busy}>
          {busy ? "Đang lưu…" : "Lưu cài đặt"}
        </button>
      </div>
    </form>
  );
}
