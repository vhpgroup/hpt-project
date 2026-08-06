# Điều phối nhập hàng dự án

Ứng dụng web quản lý danh mục hàng nhập, tiến độ và trạng thái theo từng dự án.
Next.js 15 (App Router) + React 19, dữ liệu lưu trên máy chủ bằng SQLite.

## Yêu cầu

- **Node.js >= 22.5** — dùng module `node:sqlite` có sẵn, không cần biên dịch native module.

## Chạy dự án

```bash
npm install
cp .env.example .env.local   # tuỳ chọn
npm run dev                  # http://localhost:3000
```

Lần chạy đầu tiên, database `data/hpt.db` được tạo tự động và nạp dữ liệu mẫu.
Đặt `SEED_DEMO_DATA=false` nếu muốn khởi tạo rỗng. Xoá database: `npm run db:reset`.

## Kiến trúc

```
app/
  layout.jsx  page.jsx        Vỏ trang, render <Dashboard/>
  globals.css                 Design tokens + toàn bộ style
  api/
    items/                    GET danh sách (lọc, phân trang) · POST
    items/[id]/               GET · PATCH · DELETE
    projects/                 GET · POST
    projects/[id]/            GET · PATCH · DELETE (cascade sang items)
    settings/                 GET · PUT
    stats/                    GET — số liệu tổng quan + danh sách cần chú ý
    export/                   GET — xuất CSV theo bộ lọc hiện tại
components/                   React components (Dashboard, các view, form, UI dùng chung)
lib/
  db.js                       Kết nối SQLite, schema, seed, settings
  seed-data.js                Dữ liệu mẫu
  domain.js                   Suy ra trạng thái, validate, ApiError
  repository.js               Truy vấn dữ liệu (items, projects, stats)
  http.js                     Helper cho route handler
  client.js                   Fetch wrapper + hook cho phía client
```

### Mô hình dữ liệu

`projects` 1—n `items`. Đơn vị phụ trách, mã gói thầu và địa điểm thuộc về **dự án**,
không lặp lại trên từng dòng hàng.

Trạng thái là **giá trị suy ra**, không lưu trong database:

| Điều kiện | Trạng thái |
|---|---|
| `received_qty IS NULL` | Chưa cập nhật |
| `received_qty >= plan_qty` | Hoàn thành |
| `received_qty = 0` | Chưa nhập |
| còn lại | Đang nhập |

`NULL` (chưa ai cập nhật) khác `0` (đã xác nhận chưa nhập được gì) — đây là phân biệt
quan trọng cho danh sách "dự án cần chú ý".

## API

Mọi endpoint trả JSON. Lỗi có dạng `{ error, details }`, trong đó `details` map theo
từng trường để form hiển thị đúng chỗ.

| Method | Endpoint | Ghi chú |
|---|---|---|
| GET | `/api/items` | Query: `q`, `projectId`, `owner`, `status`, `page`, `pageSize` |
| POST | `/api/items` | 201 · 422 nếu dữ liệu không hợp lệ |
| PATCH | `/api/items/:id` | Cập nhật một phần |
| DELETE | `/api/items/:id` | 204 |
| GET | `/api/projects` | Query: `q`, `owner`, `page`, `pageSize` — kèm số liệu tổng hợp |
| POST | `/api/projects` | 409 nếu trùng tên |
| GET | `/api/stats` | Metric tổng quan, phân bố trạng thái, top dự án cần chú ý |
| GET | `/api/export` | CSV (UTF-8 BOM), nhận cùng bộ lọc như `/api/items` |
| GET/PUT | `/api/settings` | Tên hệ thống, số dòng mỗi trang, danh mục đơn vị |

Lọc, tìm kiếm và phân trang đều xử lý phía server — client không tải toàn bộ bảng.

## Đổi sang database khác

Chỉ `lib/db.js` và `lib/repository.js` chạm tới SQL. Để chuyển sang Postgres/MySQL,
thay hai file này; route handler và UI giữ nguyên.

## Còn thiếu

- Xác thực người dùng và phân quyền — hiện API mở hoàn toàn, chỉ phù hợp chạy nội bộ.
- Nhật ký thay đổi (ai sửa gì, lúc nào).
- Test tự động.
