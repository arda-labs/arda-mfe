# Data Export Standard & Architecture Guide

Tài liệu quy chuẩn kiến trúc và hướng dẫn triển khai tính năng **Xuất Dữ Liệu (Excel & CSV Export)** cho toàn bộ hệ thống Monorepo Arda.

---

## 1. Hai Cấp Độ Kiến Trúc Xuất Dữ Liệu (2-Tier Backend Architecture)

Để đảm bảo **tính toàn vẹn dữ liệu (Data Consistency)**, **bảo mật (Audit Logging)** và **hiệu năng (Zero-Crash / Zero Rate-Limit)**, toàn bộ tính năng trích xuất toàn bộ dữ liệu lọc được chuyển giao 100% cho Backend xử lý theo mô hình **2-Tier**:

```mermaid
flowchart TD
    A[Yêu cầu Xuất Dữ liệu] --> B{Phạm vi & Quy mô}

    B -->|Dòng đã chọn / Trang hiện tại| C[Local UI Snapshot]
    C --> C1[Trích xuất tức thì từ RAM trình duyệt]
    C1 --> C2[SheetJS / UTF-8 CSV]

    B -->|Tất cả kết quả lọc: < 10.000 dòng| D[Tier 1: Backend Sync Streaming]
    D --> D1[Go excelize.StreamWriter O(1) RAM]
    D1 --> D2[Stream chunked qua HTTP Response]

    B -->|Tất cả kết quả lọc: > 10.000 dòng / Báo cáo nặng| E[Tier 2: Async Queue Job]
    E --> E1[Đẩy task vào Redis / Worker]
    E1 --> E2[Upload file lên Cloudflare R2 / S3]
    E2 --> E3[Gửi thông báo tải qua SSE / NotificationBell]
```

| Cấp độ | Quy mô áp dụng | Cơ chế xử lý | Trải nghiệm người dùng |
| :--- | :--- | :--- | :--- |
| **Local Snapshot** | Các dòng đang tick chọn, Trang hiện tại đang xem ($\le 100$ dòng) | Render Blob trực tiếp trên trình duyệt bằng `table-export.ts` | Tải xuống tức thì trong $< 0.5$ giây |
| **Tier 1: Backend Sync Streaming** | Tất cả kết quả lọc ($< 10.000$ dòng) | Backend stream dữ liệu qua `excelize` $O(1)$ RAM trong 1 request | Tải trực tiếp qua trình duyệt trong $1 - 3$ giây |
| **Tier 2: Async Queue Job** | $> 10.000$ dòng, báo cáo tài chính tổng hợp | Worker xử lý nền, lưu R2/S3, bắn SSE notification | Toast nhận job $\rightarrow$ Thông báo chuông $\rightarrow$ Tải từ link S3 |

> [!IMPORTANT]
> **Nguyên tắc bất biến:** Không sử dụng Client-side loop fetch hàng loạt trang (`fetchAllRows`) để ghép file tại trình duyệt vì gây lỗi N+1 HTTP request, nghẽn mạng, lệch offset dữ liệu và tràn RAM.

---

## 2. Hướng Dẫn Sử Dụng trên Frontend (`@workspace/admin-list`)

### 2.1. Sử dụng Mặc định với `ListTableToolbar`

Nút **"Xuất Excel"** trong `ListTableToolbar` đã được tự động tích hợp sẵn `TableExportDialog`. Không cần viết thêm code xử lý:

```tsx
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"

<ListTableToolbar
  table={table}
  onCreate={() => setCreateOpen(true)}
  createLabel={t("admin.users.create")}
  exportFilename="danh_sach_nguoi_dung"
  sheetName="Users"
/>
```

Khi người dùng click vào nút, hệ thống sẽ mở hộp thoại **`TableExportDialog`** cho phép:
1. **Chọn định dạng:** Excel Spreadsheet (`.xlsx`) hoặc CSV UTF-8 (`.csv`).
2. **Chọn phạm vi:** *Tất cả kết quả lọc* vs *Các dòng đang tick chọn* vs *Trang hiện tại*.
3. **Chọn cột dữ liệu:** Bật/tắt các cột cần xuất (mặc định lấy theo các cột đang hiển thị).

---

### 2.2. Xuất Trực Tiếp Dòng Đã Chọn qua `FloatingBatchActionBar`

Khi người dùng tick chọn các checkbox trên bảng, nút xuất hàng loạt có thể gọi trực tiếp hàm tiện ích `exportTableToXlsx` hoặc `exportTableToCsv`:

```tsx
import { ListPageShell } from "@workspace/admin-list/list-page-shell"
import { exportTableToXlsx } from "@workspace/admin-list/table-export"

<ListPageShell
  title={t("admin.users.title")}
  table={table}
  batchActions={(tbl) => (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        exportTableToXlsx({
          table: tbl,
          scope: "selected",
          filename: "users_selected",
          sheetName: "Selected Users",
        })
      }}
    >
      <Download className="mr-1.5 size-3.5" />
      Xuất Excel ({tbl.getSelectedRowModel().rows.length})
    </Button>
  )}
  // ...
/>
```

---

### 2.3. Tích Hợp API Xuất Phía Server (`onServerExport`)

Đối với các bảng có dữ liệu lớn cần server xử lý:

```tsx
<ListTableToolbar
  table={table}
  exportFilename="bao_cao_giao_dich"
  onServerExport={async ({ scope, format, columnIds, filename }) => {
    await transactionApi.requestExport({
      scope,
      format,
      columns: columnIds,
      filter: activeFilters,
    })
    notify.info("Yêu cầu xuất file đã được tiếp nhận. Bạn sẽ nhận thông báo khi file sẵn sàng.")
  }}
/>
```

---

## 3. Tiêu Chuẩn Định Dạng File & Tiếng Việt (Encoding Invariants)

1. **Chuẩn CSV UTF-8:**
   - Mọi tệp CSV xuất ra từ `exportTableToCsv` đều được đính kèm **Byte Order Mark (BOM `\uFEFF`)** ở đầu tệp.
   - Giúp Microsoft Excel trên cả Windows và macOS tự động nhận diện bảng mã UTF-8, hiển thị tiếng Việt có dấu hoàn hảo mà không bị lỗi font (mojibake).
2. **Chuẩn Excel OpenXML (.xlsx):**
   - Sử dụng định dạng chuẩn hiện đại **Office OpenXML Spreadsheet (.xlsx)** với thư viện SheetJS.
   - Tự động căn chỉnh độ rộng cột (`colWidths`) theo độ dài nội dung thực tế.
   - Tự động bảo toàn kiểu dữ liệu số (`number`), ngày tháng (`Date`) và chuỗi (`string`) để người dùng có thể thực hiện công thức Excel ngay lập tức.
   - Tương thích 100% không hiện cảnh báo bảo mật khi mở trên Microsoft Excel 2010 – 365, Apple Numbers, Google Sheets.

---

## 4. Quy Chuẩn Backend API (Go Backend Contract)

### 4.1. Synchronous Streaming Endpoint (Tier 1)

```http
GET /api/<domain>/export?format=xlsx&columns=code,name,amount&status=ACTIVE
```

**Nguyên tắc triển khai Go Backend:**
- Sử dụng thư viện `github.com/xuri/excelize/v2` kết hợp `file.NewStreamWriter()`.
- Ghi dữ liệu trực tiếp vào `http.ResponseWriter` để duy trì bộ nhớ $O(1)$.
- Header trả về:
  ```http
  Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  Content-Disposition: attachment; filename="export_2026-08-27.xlsx"
  Transfer-Encoding: chunked
  ```

### 4.2. Asynchronous Export Job (Tier 2)

```http
POST /api/exports
Content-Type: application/json

{
  "domain": "finance",
  "resource": "transactions",
  "format": "xlsx",
  "columns": ["id", "account_no", "amount", "created_at"],
  "filter": { "from_date": "2026-01-01", "to_date": "2026-12-31" }
}
```

**Luồng phản hồi:**
1. Server trả về `202 Accepted` kèm `jobId`.
2. Worker truy vấn DB theo batch $1.000$ rows, upload file nén lên `media-service` (Cloudflare R2/S3).
3. Đẩy thông báo qua `notification-service` $\rightarrow$ SSE đẩy về browser $\rightarrow$ User click nhận file tải về.
