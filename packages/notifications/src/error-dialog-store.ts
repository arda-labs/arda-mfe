import { create } from "zustand"

// Error dialog global — mở imperatively từ bất kỳ catch nào (showErrorDialog).
// Shell mount 1 <GlobalErrorDialog/> đọc store này. Khác notifications/toast:
// đây cho error nghiêm trọng cần trace_id dev-debug, không phải validation
// (validation đi form setError + notify.warning).

export type ErrorDialogState = {
  open: boolean
  error: unknown
  title?: string
  retry?: () => void | Promise<void>
  show: (error: unknown, opts?: { title?: string; retry?: () => void | Promise<void> }) => void
  dismiss: () => void
}

export const useErrorDialogStore = create<ErrorDialogState>((set) => ({
  open: false,
  error: undefined,
  title: undefined,
  retry: undefined,
  // duck-type ApiClientError thay vì import (tránh cycle core→auth; core
  // throw ApiClientError, ở đây chỉ đọc code/status/requestId/fields).
  show: (error, opts) =>
    set({ open: true, error, title: opts?.title, retry: opts?.retry }),
  dismiss: () =>
    set({ open: false, error: undefined, title: undefined, retry: undefined }),
}))

// Imperative helper — gọi từ catch không cần hook.
export function showErrorDialog(
  error: unknown,
  opts?: { title?: string; retry?: () => void | Promise<void> },
) {
  useErrorDialogStore.getState().show(error, opts)
}