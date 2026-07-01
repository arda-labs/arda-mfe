import { createApiClient } from "@workspace/core/http/api-client"
import { ApiErrorLike, getCurrentLocale } from "@workspace/i18n"
import { useAuthStore } from "@workspace/auth/store"
import { requestStepUp } from "@workspace/auth/step-up"

export const api = createApiClient({
  getLocale: getCurrentLocale,
  onUnauthorized: () => {
    useAuthStore.getState().logout()
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
  },
  onRecentAuthRequired: requestStepUp,
})

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
