import { createApiClient } from "@workspace/core/http/api-client"
import { ApiErrorLike, getCurrentLocale } from "@workspace/i18n"
import { ensureRecentAuth } from "@workspace/auth/ensure-recent-auth"
import { useAuthStore } from "@workspace/auth/store"

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

export function toApiError(input: unknown) {
  if (
    input &&
    typeof input === "object" &&
    "code" in input &&
    "status" in input &&
    "message" in input
  ) {
    const err = input as {
      code: string
      status: number
      message: string
      fields?: Record<string, string>
    }
    return new ApiErrorLike(err.code, err.message, err.status, err.fields)
  }
  return input
}
