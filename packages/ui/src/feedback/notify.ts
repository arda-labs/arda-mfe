import { toast } from "./toast"
import { translateApiError, i18n } from "@workspace/i18n"

function resolveDescription(description?: unknown): string | undefined {
  if (!description) return undefined
  if (typeof description === "string") return description
  return translateApiError(description)
}

function messageWithDescription(message: string, description?: unknown) {
  const desc = resolveDescription(description)
  return desc && desc !== message ? `${message}\n${desc}` : message
}

function t(key: string, fallback: string): string {
  if (i18n.isInitialized) {
    const res = i18n.t(key, { defaultValue: fallback })
    if (res) return res
  }
  return fallback
}

export const notify = {
  success: (message: string, description?: unknown) => {
    toast.success(messageWithDescription(message, description))
  },
  error: (message: string, description?: unknown) => {
    toast.error(messageWithDescription(message, description), {
      autoClose: 5000,
    })
  },
  apiError: (title: string, error: unknown) => {
    toast.error(messageWithDescription(title, translateApiError(error)), {
      autoClose: 5000,
    })
  },
  info: (message: string, description?: unknown) => {
    toast.info(messageWithDescription(message, description))
  },
  warning: (message: string, description?: unknown) => {
    toast.warning(messageWithDescription(message, description), {
      autoClose: 4000,
    })
  },
  saveSuccess: (description?: unknown) => {
    notify.success(t("common:feedback.save_success", "Lưu thành công"), description)
  },
  saveFailed: (error?: unknown) => {
    notify.error(t("common:feedback.save_failed", "Lưu thất bại"), error)
  },
  createSuccess: (description?: unknown) => {
    notify.success(t("common:feedback.create_success", "Tạo mới thành công"), description)
  },
  createFailed: (error?: unknown) => {
    notify.error(t("common:feedback.create_failed", "Tạo mới thất bại"), error)
  },
  updateSuccess: (description?: unknown) => {
    notify.success(t("common:feedback.update_success", "Cập nhật thành công"), description)
  },
  updateFailed: (error?: unknown) => {
    notify.error(t("common:feedback.update_failed", "Cập nhật thất bại"), error)
  },
  deleteSuccess: (description?: unknown) => {
    notify.success(t("common:feedback.delete_success", "Xóa thành công"), description)
  },
  deleteFailed: (error?: unknown) => {
    notify.error(t("common:feedback.delete_failed", "Xóa thất bại"), error)
  },
  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => {
    return toast.promise(promise, {
      pending: messages.loading,
      success: messages.success,
      error: {
        render: ({ data }) =>
          `${messages.error}: ${data instanceof Error ? data.message : String(data)}`,
      },
    })
  },
  dismiss: () => toast.dismiss(),
}
