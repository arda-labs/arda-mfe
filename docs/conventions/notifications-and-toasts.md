# Hướng Dẫn Chuẩn Hóa Thông Báo & Feedback (Notifications & Toasts)

Tài liệu này quy định cách hiển thị thông báo (Toast Feedback, Dialogs, Notification Bell) đồng nhất trên toàn bộ giao diện người dùng `arda-mfe`.

---

## 1. Cơ Chế Toast Feedback (`@workspace/ui/feedback/notify`)

Mọi thông báo hành động (Tạo, Sửa, Xóa, Lưu, Lỗi API) **bắt buộc** phải sử dụng module chuẩn:
`import { notify } from "@workspace/ui/feedback/notify"`

### 1.1. Các Helper Thao Tác Chuẩn (Action Helpers)
Các helper này đã tích hợp sẵn câu dịch mặc định đa ngôn ngữ từ `common:feedback.*`:

| Helper | Mục đích | Ví dụ sử dụng |
| :--- | :--- | :--- |
| `notify.saveSuccess()` | Thông báo lưu thành công | `notify.saveSuccess()` |
| `notify.saveFailed(err)` | Thông báo lưu thất bại (kèm tự động dịch lỗi từ Backend) | `notify.saveFailed(err)` |
| `notify.createSuccess()` | Thông báo tạo mới thành công | `notify.createSuccess()` |
| `notify.createFailed(err)` | Thông báo tạo mới thất bại | `notify.createFailed(err)` |
| `notify.updateSuccess()` | Thông báo cập nhật thành công | `notify.updateSuccess()` |
| `notify.updateFailed(err)` | Thông báo cập nhật thất bại | `notify.updateFailed(err)` |
| `notify.deleteSuccess()` | Thông báo xóa thành công | `notify.deleteSuccess()` |
| `notify.deleteFailed(err)` | Thông báo xóa thất bại | `notify.deleteFailed(err)` |
| `notify.apiError(title, err)` | Thông báo lỗi chung của một hành động cụ thể | `notify.apiError(t("crm.adjustments.init_failed"), err)` |

---

### 1.2. Mẫu Xử Lý Trong Form Mutation (Chuẩn Mẫu)

```tsx
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"

export function CustomerEditForm({ customerId }: { customerId: string }) {
  const { t } = useI18n()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      await api.updateCustomer(customerId, values)
      notify.saveSuccess() // Hoặc notify.success(t("crm.customers.save_success"))
      onClose()
    } catch (err) {
      // Tự động nhận diện err và dịch sang tiếng Việt/Anh phù hợp
      notify.saveFailed(err) 
    } finally {
      setIsSubmitting(false)
    }
  }

  return <form onSubmit={handleSubmit(onSubmit)}>...</form>
}
```

---

## 2. In-App Notifications (`@workspace/notifications`)

Đối với chuông thông báo (Notification Bell), Web Push và Server-Sent Events (SSE):
* **Component chuông thông báo:** `<NotificationBell />` được tích hợp sẵn ở thanh Navbar trên Shell.
* **Store lắng nghe:** `useNotificationsStore` đồng bộ danh sách thông báo chưa đọc (`unreadCount`).
* **Stream thời gian thực:** `useNotificationStream` kết nối SSE tới `notification-service`.
