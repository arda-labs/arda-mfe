# Hướng Dẫn & Chuẩn Quy Đổi Đa Ngôn Ngữ (i18n & Localization)

Tài liệu này mô tả chi tiết kiến trúc, quy tắc phát triển và quy trình deploy hệ thống đa ngôn ngữ (i18n) cho kiến trúc Micro-Frontend `arda-mfe`.

---

## 1. Kiến Trúc Tổng Thể (Architecture Overview)

Hệ thống i18n của Arda được thiết kế theo mô hình **Co-location kết hợp Core Foundation Resources**:

```
arda-mfe/
├── packages/
│   └── i18n/
│       ├── src/
│       │   ├── locales/               <-- 8 Từ Điển Dùng Chung Cốt Lõi (Core Foundation)
│       │   │   ├── vi-VN/             (admin, auth, common, navigation,
│       │   │   └── en-US/              notifications, profile, user, validation)
│       │   ├── config.ts              <-- Khởi tạo i18next & fallback missingKeyHandler
│       │   └── index.tsx              <-- Export translateApiError, registerAppLocales...
├── apps/
│   ├── crm/locales/{vi-VN, en-US}.json        <-- Bản dịch riêng biệt của từng App MFE
│   ├── iam/locales/{vi-VN, en-US}.json
│   ├── platform/locales/{vi-VN, en-US}.json
│   ├── workflow/locales/{vi-VN, en-US}.json
│   ├── finance/locales/{vi-VN, en-US}.json
│   ├── account/locales/{vi-VN, en-US}.json
│   └── hrm/locales/{vi-VN, en-US}.json
└── packages/
    └── ai/locales/{vi-VN, en-US}.json         <-- Bản dịch riêng của package AI
```

---

## 2. Nguyên Tắc & Quy Định Đặt Bản Dịch (Rules)

### 2.1. Phân chia từ điển (Namespace Rules)
* **Từ điển dùng chung (`packages/i18n/src/locales/`):** Chỉ chứa các text dùng xuyên suốt hệ thống (các nút bấm chung, thông báo lỗi hệ thống, menu điều hướng, hồ sơ người dùng).
* **Từ điển riêng của App (`apps/<app>/locales/`):** Mỗi App MFE sở hữu 1 thư mục `locales/` chứa toàn bộ nhãn, cột bảng biểu, tiêu đề, form fields liên quan đến domain nghiệp vụ của App đó.

### 2.2. Đăng Ký Bản Dịch Trong App MFE
Mỗi App tự nạp bản dịch của mình tại entry point (`Routes.tsx` hoặc `provider.tsx`) thông qua `registerAppLocales`:

```tsx
// apps/crm/src/Routes.tsx
import { registerAppLocales } from "@workspace/i18n"
import enUS from "../locales/en-US.json"
import viVN from "../locales/vi-VN.json"

// Tự động đăng ký namespace 'crm' (hoặc namespace tương ứng)
registerAppLocales("crm", {
  "en-US": enUS,
  "vi-VN": viVN,
})
```

---

## 3. Cách Sử Dụng Trong Component

### 3.1. Dịch văn bản thông thường (`useI18n`)
```tsx
import { useI18n } from "@workspace/i18n"

export function CustomerList() {
  const { t } = useI18n()

  return (
    <div>
      <h1>{t("crm.customers.profiles.title")}</h1>
      <button>{t("common.action.save")}</button>
    </div>
  )
}
```

### 3.2. Tự động dịch lỗi API (`translateApiError`)
Hàm `translateApiError` tự động trích xuất `code` từ response lỗi Backend (hoặc HTTP status) và tìm câu dịch tương ứng:

```tsx
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"

try {
  await api.saveCustomer(data)
} catch (err) {
  // Tự động dịch mã lỗi từ BE (ví dụ: crm.customer.conflict -> "Hồ sơ đang chờ duyệt")
  notify.error(t("crm.customers.save_failed"), translateApiError(err))
}
```

---

## 4. Tự Động Kiểm Tra Tính Đầy Đủ (CI Guardrail)

Để ngăn ngừa việc dev thêm key ở `vi-VN.json` nhưng quên thêm ở `en-US.json` (hoặc ngược lại), hệ thống đã tích hợp script:

```bash
bun run check:i18n
```

Script này được nối trực tiếp vào pipeline `bun run typecheck`. Nếu phát hiện bất kỳ key nào bị lệch giữa 2 ngôn ngữ ở bất kỳ app hay package nào, **CI sẽ tự động báo lỗi và chặn merge PR**.

---

## 5. Đóng Gói & Phân Phối Trên Cloudflare Workers

Khi chạy lệnh build Cloudflare (`bun run cf:build:all` hoặc `bun run cf:build <app>`):
* Script [`scripts/build-cloudflare-app.mjs`](scripts/build-cloudflare-app.mjs) sẽ tự động sao chép các file `locales/*.json` vào thư mục static assets của Worker: `.cloudflare/dist/<app>/locales/`.
* Worker phục vụ các static assets này kèm theo headers tối ưu:
  * `Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=86400`
  * `Access-Control-Allow-Origin: *`
