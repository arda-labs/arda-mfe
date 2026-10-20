type Translate = (key: string, params?: Record<string, string | number>) => string

const PROTECTED_PREFIX = "protected process variables cannot be changed:"

/**
 * Human-readable description for a failed Operate write (edit variables,
 * cancel instance). workflow-service answers with:
 *   400 reason missing / protected variable keys (names listed in the message)
 *   404 instance, or element instance outside this instance
 *   409 case already closed (cancel)
 *   502 Zeebe rejected the command — nothing changed on the instance
 *   503 element scope cannot be verified without the runtime read model
 * Anything else falls back to the server message.
 */
export function operateActionErrorMessage(
  t: Translate,
  error: unknown
): string | undefined {
  const status =
    error && typeof error === "object" && "status" in error
      ? Number((error as { status: unknown }).status)
      : undefined
  const message = error instanceof Error ? error.message : undefined

  switch (status) {
    case 400: {
      const lower = message?.toLowerCase() ?? ""
      const at = lower.indexOf(PROTECTED_PREFIX)
      if (at >= 0 && message) {
        const names = message.slice(at + PROTECTED_PREFIX.length).trim()
        return t("workflow.operate.error_protected_variables", { names })
      }
      if (lower.includes("reason is required")) {
        return t("workflow.operate.reason_required")
      }
      return message
    }
    case 404:
      return t("workflow.operate.error_not_found")
    case 409:
      return t("workflow.operate.error_case_closed")
    case 502:
      return t("workflow.operate.error_engine")
    case 503:
      return t("workflow.operate.error_unavailable")
    default:
      return message
  }
}
