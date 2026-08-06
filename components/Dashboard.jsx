"use client";

import { useCallback, useState } from "react";
import { api, useResource } from "@/lib/client";
import AuditView from "./AuditView";
import ImportExcelDialog from "./ImportExcelDialog";
import InventoryView from "./InventoryView";
import ItemForm from "./ItemForm";
import OverviewView from "./OverviewView";
import PackageForm from "./PackageForm";
import PackagesView from "./PackagesView";
import ProjectForm from "./ProjectForm";
import ReceiptsPanel from "./ReceiptsPanel";
import SettingsView from "./SettingsView";
import { ConfirmDialog, Toast } from "./ui";

const VIEWS = [
  { id: "overview",  group: "Quản lý",  icon: "⌂", label: "Tổng quan",     hint: "Tình hình nhập hàng",  title: "Tổng quan nhập hàng", description: "Theo dõi tiến độ, gói thầu sắp đến hạn và những điểm nghẽn cần xử lý." },
  { id: "packages",  group: "Quản lý",  icon: "◫", label: "Gói thầu",      hint: "Theo mã TBMT",         title: "Quản lý gói thầu",    description: "Mỗi dự án có thể gồm nhiều gói thầu, theo dõi riêng hạn giao và tiến độ." },
  { id: "inventory", group: "Quản lý",  icon: "▦", label: "Danh mục hàng", hint: "Hàng hóa & đợt nhập",  title: "Danh mục hàng hóa",   description: "Tra cứu, lọc và ghi nhận từng đợt hàng về theo dòng hàng." },
  { id: "audit",     group: "Hệ thống", icon: "☰", label: "Nhật ký",       hint: "Lịch sử thay đổi",     title: "Nhật ký thay đổi",    description: "Mọi thao tác thêm, sửa, xóa đều được ghi lại kèm người thực hiện và thời điểm." },
  { id: "settings",  group: "Hệ thống", icon: "⚙", label: "Cài đặt",       hint: "Danh mục dùng chung",  title: "Cài đặt hệ thống",    description: "Cấu hình tên hệ thống và các danh mục dùng chung." },
];

export default function Dashboard() {
  const [view, setView] = useState("overview");
  const [toast, setToast] = useState(null);
  const [itemForm, setItemForm] = useState(null);
  const [packageForm, setPackageForm] = useState(null);
  const [projectForm, setProjectForm] = useState(null);
  const [receiptsFor, setReceiptsFor] = useState(null);
  const [importExcel, setImportExcel] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [packageFilter, setPackageFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  const stats = useResource("/stats");
  const settings = useResource("/settings");
  const projectOptions = useResource("/projects?pageSize=500");
  const packageOptions = useResource("/packages?pageSize=500");

  const owners = stats.data?.owners ?? [];
  const projects = projectOptions.data?.data ?? [];
  const packages = packageOptions.data?.data ?? [];
  const active = VIEWS.find((v) => v.id === view);

  const refreshAll = useCallback(() => {
    stats.reload();
    projectOptions.reload();
    packageOptions.reload();
    setRefreshKey((k) => k + 1);
  }, [stats, projectOptions, packageOptions]);

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
            <small>Dự án · Gói thầu · Hàng hóa</small>
          </div>
        </div>

        <nav className="nav" aria-label="Điều hướng chính">
          {VIEWS.map((entry, index) => (
            <div key={entry.id}>
              {VIEWS[index - 1]?.group !== entry.group && <span className="nav-group">{entry.group}</span>}
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
            refreshKey={refreshKey}
            onAddProject={() => setProjectForm({})}
            onEditProject={(project) => setProjectForm({ project })}
            onOpenPackages={(project) => { setProjectFilter(project.id); setView("packages"); }}
            onDeleteProject={(project) =>
              setConfirm({
                title: "Xóa dự án",
                message: `Xóa "${project.name}" sẽ xóa theo ${project.packageCount} gói thầu và ${project.itemCount} dòng hàng hóa. Thao tác không thể hoàn tác.`,
                path: `/projects/${project.id}`,
                successMessage: "Đã xóa dự án.",
              })
            }
          />
        )}

        {view === "packages" && (
          <PackagesView
            projects={projects}
            owners={owners}
            pageSize={settings.data?.pageSize ?? 10}
            refreshKey={refreshKey}
            initialProjectId={projectFilter}
            onAddPackage={() => setPackageForm({})}
            onEditPackage={(pkg) => setPackageForm({ pkg })}
            onOpenItems={(pkg) => { setPackageFilter(pkg.id); setView("inventory"); }}
            onDeletePackage={(pkg) =>
              setConfirm({
                title: "Xóa gói thầu",
                message: `Xóa gói "${pkg.name || pkg.code}" sẽ xóa theo ${pkg.itemCount} dòng hàng hóa và toàn bộ lịch sử đợt nhập. Thao tác không thể hoàn tác.`,
                path: `/packages/${pkg.id}`,
                successMessage: "Đã xóa gói thầu.",
              })
            }
          />
        )}

        {view === "inventory" && (
          <InventoryView
            packages={packages}
            owners={owners}
            pageSize={settings.data?.pageSize ?? 10}
            refreshKey={refreshKey}
            initialPackageId={packageFilter}
            onImportExcel={() => setImportExcel(true)}
            onAddItem={() => setItemForm({})}
            onEditItem={(item) => setItemForm({ item })}
            onOpenReceipts={(item) => setReceiptsFor(item)}
            onDeleteItem={(item) =>
              setConfirm({
                title: "Xóa hàng hóa",
                message: `Xóa dòng hàng "${item.name}"${item.receiptCount ? ` cùng ${item.receiptCount} đợt nhập đã ghi nhận` : ""}? Thao tác không thể hoàn tác.`,
                path: `/items/${item.id}`,
                successMessage: "Đã xóa hàng hóa.",
              })
            }
          />
        )}

        {view === "audit" && (
          <AuditView pageSize={settings.data?.pageSize ?? 20} refreshKey={refreshKey} />
        )}

        {view === "settings" && settings.data && (
          <SettingsView settings={settings.data} onSaved={() => settings.reload()} onToast={notify} />
        )}
      </main>

      {projectForm && (
        <ProjectForm
          project={projectForm.project}
          onClose={() => setProjectForm(null)}
          onSaved={(_saved, isEdit) => {
            setProjectForm(null);
            notify({ message: isEdit ? "Đã cập nhật dự án." : "Đã thêm dự án.", tone: "ok" });
            refreshAll();
          }}
        />
      )}

      {packageForm && (
        <PackageForm
          pkg={packageForm.pkg}
          projects={projects}
          owners={settings.data?.owners ?? []}
          defaultProjectId={projectFilter}
          onClose={() => setPackageForm(null)}
          onSaved={(_saved, isEdit) => {
            setPackageForm(null);
            notify({ message: isEdit ? "Đã cập nhật gói thầu." : "Đã thêm gói thầu.", tone: "ok" });
            refreshAll();
          }}
        />
      )}

      {itemForm && (
        <ItemForm
          item={itemForm.item}
          packages={packages}
          units={settings.data?.units ?? []}
          defaultPackageId={packageFilter}
          onClose={() => setItemForm(null)}
          onSaved={(_saved, isEdit) => {
            setItemForm(null);
            notify({ message: isEdit ? "Đã cập nhật hàng hóa." : "Đã thêm hàng hóa.", tone: "ok" });
            refreshAll();
          }}
        />
      )}

      {receiptsFor && (
        <ReceiptsPanel
          item={receiptsFor}
          onClose={() => setReceiptsFor(null)}
          onChanged={refreshAll}
        />
      )}

      {importExcel && (
        <ImportExcelDialog
          onClose={() => setImportExcel(false)}
          onImported={(result) => {
            setImportExcel(false);
            const parts = [`${result.imported} dòng hàng hóa`];
            if (result.replaced) parts.push(`ghi đè ${result.replaced}`);
            if (result.skipped) parts.push(`bỏ qua ${result.skipped} dòng trùng`);
            if (result.packagesCreated) parts.push(`tạo ${result.packagesCreated} gói thầu`);
            notify({ message: `Đã nhập ${parts.join(", ")}.`, tone: "ok" });
            settings.reload();
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
