import { createApiClient } from "@workspace/core/http/api-client"
import { getCurrentLocale } from "@workspace/i18n"
import { ensureRecentAuth } from "@workspace/auth/ensure-recent-auth"
import { useAuthStore } from "@workspace/auth/store"

// Composition root: createApiClient (thuần, core) + auth + i18n → instance
// `api` configured. ApiClientError đã có code/status/fields/requestId;
// catch dùng `instanceof ApiClientError`, không cần bọc lớp nào khác.
export const api = createApiClient({
  getLocale: getCurrentLocale,
  onUnauthorized: () => {
    useAuthStore.getState().logout()
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
  },
  onRecentAuthRequired: ensureRecentAuth,
})

export { ensureRecentAuth }