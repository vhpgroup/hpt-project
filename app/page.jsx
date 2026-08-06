import Script from "next/script";

export default function HomePage() {
  return (
    <>
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">N</div>
          <div>
            <h1 id="systemNameHeading">Điều phối nhập hàng</h1>
            <p>Quản lý danh mục và tiến độ theo dự án</p>
          </div>
        </div>
        <nav className="main-nav" aria-label="Điều hướng chính">
          <span className="nav-section-label">QUẢN LÝ</span>
          <button className="nav-button active" data-view="overview"><span className="nav-icon">⌂</span><span>Tổng quan<small>Tình hình nhập hàng</small></span></button>
          <button className="nav-button" data-view="inventory"><span className="nav-icon">▦</span><span>Danh mục hàng<small>Quản lý hàng hóa</small></span></button>
          <span className="nav-section-label nav-section-spaced">HỆ THỐNG</span>
          <button className="nav-button" data-view="settings"><span className="nav-icon">⚙</span><span>Cài đặt<small>Danh mục dùng chung</small></span></button>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user"><span className="user-avatar">AD</span><span><strong>Quản trị viên</strong><small>Đang hoạt động</small></span></div>
          <div className="sidebar-status"><span className="status-dot"></span>Dữ liệu lưu trên thiết bị</div>
        </div>
      </header>

      <main className="page-shell">
        <section className="page-intro">
          <div>
            <span className="eyebrow">TRUNG TÂM ĐIỀU HÀNH</span>
            <h2 id="pageTitle">Tổng quan nhập hàng</h2>
            <p id="pageDescription">Theo dõi nhanh tiến độ, điểm nghẽn và những dự án cần cập nhật.</p>
          </div>
          <div className="header-actions">
            <button className="button button-quiet" id="exportButton">⇩ Xuất CSV</button>
            <button className="button button-primary" id="addButton">+ Thêm hàng hóa</button>
          </div>
        </section>

        <section id="overviewView" className="view active">
          <div className="metric-grid" id="metricGrid"></div>

          <div className="overview-grid">
            <article className="panel status-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">TÌNH HÌNH CHUNG</span>
                  <h3>Phân bố trạng thái</h3>
                </div>
                <span className="small-note">Theo số dòng hàng hóa</span>
              </div>
              <div id="statusChart" className="status-chart"></div>
            </article>

            <article className="panel attention-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">ƯU TIÊN HÔM NAY</span>
                  <h3>Dự án cần chú ý</h3>
                </div>
              </div>
              <div id="attentionList" className="attention-list"></div>
            </article>
          </div>

          <article className="panel project-panel">
            <div className="panel-heading project-heading">
              <div>
                <span className="section-kicker">DANH MỤC DỰ ÁN</span>
                <h3>Tiến độ theo dự án</h3>
              </div>
              <div className="compact-filters">
                <label className="search-box">
                  <span aria-hidden="true">⌕</span>
                  <input id="projectSearch" type="search" placeholder="Tìm dự án..." />
                </label>
                <select id="projectOwnerFilter" aria-label="Lọc đơn vị phụ trách"></select>
                <button className="button button-primary" id="addProjectButton">+ Thêm dự án</button>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table project-table">
                <thead>
                  <tr>
                    <th>Dự án</th>
                    <th>Đơn vị</th>
                    <th>Dòng hàng</th>
                    <th>Hoàn thành</th>
                    <th>Đang nhập</th>
                    <th>Chưa nhập</th>
                    <th>Tiến độ</th>
                    <th>Cập nhật</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody id="projectTableBody"></tbody>
              </table>
            </div>
            <div className="pagination" id="projectPagination"></div>
          </article>
        </section>

        <section id="inventoryView" className="view">
          <article className="panel inventory-panel">
            <div className="inventory-toolbar">
              <label className="search-box wide">
                <span aria-hidden="true">⌕</span>
                <input id="itemSearch" type="search" placeholder="Tìm hàng hóa, mã hiệu, hãng sản xuất..." />
              </label>
              <select id="projectFilter" aria-label="Lọc dự án"></select>
              <select id="ownerFilter" aria-label="Lọc đơn vị"></select>
              <select id="statusFilter" aria-label="Lọc trạng thái">
                <option value="">Tất cả trạng thái</option>
                <option value="Hoàn thành">Hoàn thành</option>
                <option value="Đang nhập">Đang nhập</option>
                <option value="Chưa nhập">Chưa nhập</option>
                <option value="Chưa cập nhật">Chưa cập nhật</option>
              </select>
              <button className="button button-quiet" id="clearFilters">Xóa bộ lọc</button>
            </div>
            <div className="result-summary" id="resultSummary"></div>
            <div className="table-wrap">
              <table className="data-table inventory-table">
                <thead>
                  <tr>
                    <th>Dự án / Hàng hóa</th>
                    <th>ĐVT</th>
                    <th>Kế hoạch</th>
                    <th>Đã nhập</th>
                    <th>Còn lại</th>
                    <th>Tiến độ</th>
                    <th>Trạng thái</th>
                    <th>Cập nhật</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody id="inventoryTableBody"></tbody>
              </table>
            </div>
            <div className="pagination" id="inventoryPagination"></div>
          </article>
        </section>

        <section id="settingsView" className="view">
          <div className="settings-grid">
            <article className="panel settings-card settings-general">
              <div className="panel-heading">
                <div><span className="section-kicker">CẤU HÌNH CHUNG</span><h3>Hiển thị website</h3></div>
              </div>
              <form id="generalSettingsForm">
                <label>Tên hệ thống<input id="systemNameSetting" required /></label>
                <label>Số dòng mỗi trang
                  <select id="pageSizeSetting">
                    <option value="5">5 dòng</option>
                    <option value="10">10 dòng</option>
                    <option value="20">20 dòng</option>
                    <option value="50">50 dòng</option>
                  </select>
                </label>
                <div className="settings-actions"><button className="button button-primary" type="submit">Lưu cấu hình</button></div>
              </form>
            </article>

            <article className="panel settings-card">
              <span className="section-kicker">DANH MỤC DÙNG CHUNG</span><h3>Đơn vị phụ trách</h3>
              <form className="setting-add-form" data-setting="owners"><input aria-label="Thêm đơn vị phụ trách" placeholder="Nhập tên đơn vị..." required /><button className="button button-primary" type="submit">+ Thêm</button></form>
              <div className="setting-list" id="ownerSettingsList"></div>
            </article>

            <article className="panel settings-card">
              <span className="section-kicker">DANH MỤC DÙNG CHUNG</span><h3>Đơn vị tính</h3>
              <form className="setting-add-form" data-setting="units"><input aria-label="Thêm đơn vị tính" placeholder="Ví dụ: Cái, Bộ, Gói..." required /><button className="button button-primary" type="submit">+ Thêm</button></form>
              <div className="setting-list" id="unitSettingsList"></div>
            </article>

            <article className="panel settings-card">
              <span className="section-kicker">DANH MỤC DÙNG CHUNG</span><h3>Hãng sản xuất</h3>
              <form className="setting-add-form" data-setting="makers"><input aria-label="Thêm hãng sản xuất" placeholder="Nhập tên hãng..." required /><button className="button button-primary" type="submit">+ Thêm</button></form>
              <div className="setting-list" id="makerSettingsList"></div>
            </article>
          </div>
        </section>

        <div className="view-navigation" aria-label="Điều hướng màn hình">
          <button className="button button-quiet view-step-button" id="backViewButton" type="button">← Back</button>
          <span id="viewStep">1 / 3</span>
          <button className="button button-primary view-step-button" id="nextViewButton" type="button">Next →</button>
        </div>
      </main>

      <div className="modal-backdrop" id="modalBackdrop" aria-hidden="true">
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
          <div className="modal-header">
            <div><span className="section-kicker">CẬP NHẬT DANH MỤC</span><h3 id="modalTitle">Thêm hàng hóa</h3></div>
            <button className="icon-button" id="closeModal" aria-label="Đóng">×</button>
          </div>
          <form id="itemForm">
            <div className="form-grid two">
              <label>Dự án <b>*</b><input id="fieldProject" required /></label>
              <label>Đơn vị phụ trách <b>*</b><input id="fieldOwner" list="ownerOptions" required /></label>
            </div>
            <label>Danh mục hàng hóa <b>*</b><textarea id="fieldName" required rows="3"></textarea></label>
            <div className="form-grid three">
              <label>Đơn vị tính <b>*</b><input id="fieldUnit" list="unitOptions" required /></label>
              <label>Khối lượng kế hoạch <b>*</b><input id="fieldPlan" type="number" min="0" step="any" required /></label>
              <label>Đã nhập<input id="fieldReceived" type="number" min="0" step="any" /></label>
            </div>
            <div className="form-grid three">
              <label>Ngày cập nhật<input id="fieldDate" type="date" /></label>
              <label>Mã TBMT<input id="fieldBid" /></label>
              <label>STT<input id="fieldOrder" /></label>
            </div>
            <div className="form-grid two">
              <label>Ký mã hiệu<input id="fieldModel" /></label>
              <label>Hãng sản xuất<input id="fieldMaker" list="makerOptions" /></label>
            </div>
            <label>Địa điểm dự án<input id="fieldLocation" /></label>
            <div className="modal-actions">
              <button type="button" className="button button-quiet" id="cancelModal">Hủy</button>
              <button type="submit" className="button button-primary">Lưu thông tin</button>
            </div>
          </form>
        </section>
      </div>

      <div className="modal-backdrop" id="projectModalBackdrop" aria-hidden="true">
        <section className="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="projectModalTitle">
          <div className="modal-header">
            <div><span className="section-kicker">QUẢN LÝ DỰ ÁN</span><h3 id="projectModalTitle">Thêm dự án</h3></div>
            <button className="icon-button" id="closeProjectModal" aria-label="Đóng">×</button>
          </div>
          <form id="projectForm">
            <label>Tên dự án <b>*</b><input id="projectNameField" required /></label>
            <div className="form-grid two">
              <label>Đơn vị phụ trách <b>*</b><input id="projectOwnerField" list="ownerOptions" required /></label>
              <label>Mã TBMT<input id="projectBidField" /></label>
            </div>
            <label>Địa điểm dự án<input id="projectLocationField" /></label>
            <div className="modal-actions">
              <button type="button" className="button button-quiet" id="cancelProjectModal">Hủy</button>
              <button type="submit" className="button button-primary">Lưu dự án</button>
            </div>
          </form>
        </section>
      </div>

      <div className="modal-backdrop" id="confirmModalBackdrop" aria-hidden="true">
        <section className="modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirmModalTitle" aria-describedby="confirmModalMessage">
          <div className="confirm-icon" aria-hidden="true">!</div>
          <div className="confirm-copy">
            <h3 id="confirmModalTitle">Xác nhận xóa</h3>
            <p id="confirmModalMessage"></p>
          </div>
          <div className="modal-actions">
            <button type="button" className="button button-quiet" id="cancelConfirmModal">Hủy</button>
            <button type="button" className="button button-danger" id="acceptConfirmModal">Xóa</button>
          </div>
        </section>
      </div>

      <datalist id="ownerOptions"></datalist>
      <datalist id="unitOptions"></datalist>
      <datalist id="makerOptions"></datalist>

      <div className="toast" id="toast" role="status"></div>
      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}
