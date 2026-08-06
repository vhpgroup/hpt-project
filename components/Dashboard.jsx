"use client";

import { useCallback, useState } from "react";
import { api, useResource } from "@/lib/client";
import ImportExcelDialog from "./ImportExcelDialog";
import InventoryView from "./InventoryView";
import ItemForm from "./ItemForm";
import OverviewView from "./OverviewView";
import ProjectForm from "./ProjectForm";
import SettingsView from "./SettingsView";
import { ConfirmDialog, Toast } from "./ui";

const VIEWS = [
  { id: "overview",  group: "Quản lý", icon: "⌂", label: "Tổng quan",    hint: "Tình hình nhập hàng", title: "Tổng quan nhập hàng", description: "Theo dõi nhanh tiến độ, điểm nghẽn và những dự án cần cập nhật." },
  { id: "inventory", group: "Quản lý", icon: "▦", label: "Danh mục hàng", hint: "Quản lý hàng hóa",   title: "Danh mục hàng hóa",   description: "Tra cứu, lọc và cập nhật từng dòng hàng theo dự án." },
  { id: "settings",  group: "Hệ thống", icon: "⚙", label: "Cài đặt",      hint: "Danh mục dùng chung", title: "Cài đặt hệ thống",    description: "Cấu hình tên hệ thống và các danh mục dùng chung." },
];

export default function Dashboard() {
  const [view, setView] = useState("overview");
  const [toast, setToast] = useState(null);
  const [itemForm, setItemForm] = useState(null);       // { item? } | null
  const [importExcel, setImportExcel] = useState(false);
  const [projectForm, setProjectForm] = useState(null); // { project? } | null
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const stats = useResource("/stats");
  const settings = useResource("/settings");
  // Danh sách rút gọn cho các ô chọn dự án trong form và bộ lọc.
  const projectOptions = useResource("/projects?pageSize=200");

  const owners = stats.data?.owners ?? [];
  const projects = projectOptions.data?.data ?? [];
  const active = VIEWS.find((v) => v.id === view);

  const refreshAll = useCallback(() => {
    stats.reload();
    projectOptions.reload();
    setRefreshKey((k) => k + 1);
  }, [stats, projectOptions]);

  const notify = useCallback((next) => setToast(next), []);

  async function runDelete() {
    setConfirmBusy(true);
    try {
      await api(confirm.path, { method: "DELETE" });
      notify({ message: confirm.successMessage, tone: "ok" });
      setConfirm(null);
      refreshAll();
    } catch (err) {
      notify({ message: err.message, tone: "danger" });
    } finally {
      setConfirmBusy(false);
    }
  }

  const loadFailed = stats.error || settings.error;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">N</span>
          <div>
            <strong>{settings.data?.systemName ?? "Điều phối nhập hàng"}</strong>
            <small>Quản lý danh mục và tiến độ</small>
          </div>
        </div>

        <nav className="nav" aria-label="Điều hướng chính">
          {VIEWS.map((entry, index) => (
            <div key={entry.id}>
              {VIEWS[index - 1]?.group !== entry.group && (
                <span className="nav-group">{entry.group}</span>
              )}
              <button
                className={`nav-item${view === entry.id ? " active" : ""}`}
                onClick={() => setView(entry.id)}
                aria-current={view === entry.id ? "page" : undefined}
              >
                <span className="nav-icon" aria-hidden="true">{entry.icon}</span>
                <span className="nav-text">
                  <strong>{entry.label}</strong>
                  <small>{entry.hint}</small>
                </span>
              </button>
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-user">
            <span className="avatar">AD</span>
            <span><strong>Quản trị viên</strong><small>Đang hoạt động</small></span>
          </div>
          <div className="sidebar-status">
            <span className={`dot ${loadFailed ? "dot-danger" : "dot-ok"}`} />
            {loadFailed ? "Mất kết nối máy chủ" : "Dữ liệu lưu trên máy chủ"}
          </div>
        </div>
      </aside>

      <main className="content">
        <header className="page-head">
          <div>
            <span className="eyebrow">Trung tâm điều hành</span>
            <h1>{active.title}</h1>
            <p>{active.description}</p>
          </div>
        </header>

        {loadFailed && (
          <div className="form-alert">
            Không tải được dữ liệu từ máy chủ. Kiểm tra kết nối rồi tải lại trang.
          </div>
        )}

        {view === "overview" && (
          <OverviewView
            stats={stats.data}
            statsLoading={stats.loading}
            owners={owners}
            refreshKey={refreshKey}
            onAddProject={() => setProjectForm({})}
            onEditProject={(project) => setProjectForm({ project })}
            onDeleteProject={(project) =>
              setConfirm({
                title: "Xóa dự án",
                message: `Xóa "${project.name}" sẽ xóa theo ${project.itemCount} dòng hàng hóa thuộc dự án. Thao tác không thể hoàn tác.`,
                path: `/projects/${project.id}`,
                successMessage: "Đã xóa dự án.",
              })
            }
          />
        )}

        {view === "inventory" && (
          <InventoryView
            projects={projects}
            owners={owners}
            pageSize={settings.data?.pageSize ?? 10}
            refreshKey={refreshKey}
            onImportExcel={() => setImportExcel(true)}
            onAddItem={() => setItemForm({})}
            onEditItem={(item) => setItemForm({ item })}
            onDeleteItem={(item) =>
              setConfirm({
                title: "Xóa hàng hóa",
                message: `Xóa dòng hàng "${item.name}"? Thao tác không thể hoàn tác.`,
                path: `/items/${item.id}`,
                successMessage: "Đã xóa hàng hóa.",
              })
            }
          />
        )}

        {view === "settings" && settings.data && (
          <SettingsView
            settings={settings.data}
            onSaved={() => settings.reload()}
            onToast={notify}
          />
        )}
      </main>

      {itemForm && (
        <ItemForm
          item={itemForm.item}
          projects={projects}
          units={settings.data?.units ?? []}
          onClose={() => setItemForm(null)}
          onSaved={(_saved, isEdit) => {
            setItemForm(null);
            notify({ message: isEdit ? "Đã cập nhật hàng hóa." : "Đã thêm hàng hóa.", tone: "ok" });
            refreshAll();
          }}
        />
      )}

      {importExcel && (
        <ImportExcelDialog
          onClose={() => setImportExcel(false)}
          onImported={(result) => {
            setImportExcel(false);
            notify({
              message: `Đã nhập ${result.imported} dòng hàng hóa${result.projectsCreated ? ` và tạo ${result.projectsCreated} dự án mới` : ""}.`,
              tone: "ok",
            });
            settings.reload();
            refreshAll();
          }}
        />
      )}

      {projectForm && (
        <ProjectForm
          project={projectForm.project}
          owners={settings.data?.owners ?? []}
          onClose={() => setProjectForm(null)}
          onSaved={(_saved, isEdit) => {
            setProjectForm(null);
            notify({ message: isEdit ? "Đã cập nhật dự án." : "Đã thêm dự án.", tone: "ok" });
            refreshAll();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel="Xóa"
        busy={confirmBusy}
        onConfirm={runDelete}
        onCancel={() => setConfirm(null)}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
