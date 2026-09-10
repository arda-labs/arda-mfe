export type AiErrorCode =
  | "ai.model_unavailable"
  | "ai.model_unauthorized"
  | "ai.model_rate_limited"
  | "ai.model_timeout"
  | "ai.run_timeout"
  | "ai.run_cancelled"
  | "ai.tool_forbidden"
  | "ai.tool_not_found"
  | "ai.tool_invalid"
  | "ai.agent_step_limit"
  | "ai.run_replay"
  | "ai.persistence_unavailable"
  | "ai.sandbox_quota_exceeded"
  | "ai.sandbox_script_rejected"
  | "ai.sandbox_busy"
  | "ai.sandbox_timeout"
  | "ai.sandbox_output_too_large"
  | "ai.approval_unavailable"
  | "ai.approval_expired"
  | "ai.approval_persistence_unavailable"
  | "ai.rate_limited"
  | "ai.budget_exceeded"
  | "ai.quota_exceeded"
  | "ai.quota_unavailable"
  | "ai.not_ready"
  | "ai.analytics_persistence_unavailable"

export type AiErrorSeverity = "transient" | "user" | "system"

export type AiErrorAction =
  | "retry"
  | "rephrase"
  | "contact_admin"
  | "split_query"
  | "open_settings"

export type AiErrorMeta = {
  /** Translation key in ai namespace */
  i18nKey: string
  /** Can the user or system retry directly */
  retryable: boolean
  /** Severity level */
  severity: AiErrorSeverity
  /** Recommended action */
  action?: AiErrorAction
}

export const AI_ERROR_MAP: Record<string, AiErrorMeta> = {
  "ai.model_unavailable": {
    i18nKey: "ai.error.model_unavailable",
    retryable: true,
    severity: "transient",
    action: "open_settings",
  },
  "ai.model_unauthorized": {
    i18nKey: "ai.error.model_unauthorized",
    retryable: false,
    severity: "user",
    action: "open_settings",
  },
  "ai.model_rate_limited": {
    i18nKey: "ai.error.model_rate_limited",
    retryable: true,
    severity: "transient",
    action: "retry",
  },
  "ai.model_timeout": {
    i18nKey: "ai.error.model_timeout",
    retryable: true,
    severity: "transient",
    action: "retry",
  },
  "ai.run_timeout": {
    i18nKey: "ai.error.run_timeout",
    retryable: true,
    severity: "transient",
    action: "retry",
  },
  "ai.run_cancelled": {
    i18nKey: "ai.error.cancelled",
    retryable: false,
    severity: "user",
  },
  "ai.tool_forbidden": {
    i18nKey: "ai.error.tool_forbidden",
    retryable: false,
    severity: "user",
    action: "contact_admin",
  },
  "ai.tool_not_found": {
    i18nKey: "ai.error.tool_not_found",
    retryable: false,
    severity: "system",
  },
  "ai.tool_invalid": {
    i18nKey: "ai.error.tool_invalid",
    retryable: true,
    severity: "user",
    action: "rephrase",
  },
  "ai.agent_step_limit": {
    i18nKey: "ai.error.step_limit",
    retryable: false,
    severity: "user",
    action: "split_query",
  },
  "ai.run_replay": {
    i18nKey: "ai.error.run_replay",
    retryable: true,
    severity: "transient",
    action: "retry",
  },
  "ai.persistence_unavailable": {
    i18nKey: "ai.error.persistence_unavailable",
    retryable: true,
    severity: "transient",
    action: "retry",
  },
  "ai.analytics_persistence_unavailable": {
    i18nKey: "ai.error.persistence_unavailable",
    retryable: true,
    severity: "transient",
    action: "retry",
  },
  "ai.sandbox_quota_exceeded": {
    i18nKey: "ai.error.sandbox_quota",
    retryable: false,
    severity: "user",
    action: "split_query",
  },
  "ai.sandbox_script_rejected": {
    i18nKey: "ai.error.sandbox_rejected",
    retryable: false,
    severity: "system",
  },
  "ai.sandbox_busy": {
    i18nKey: "ai.error.sandbox_busy",
    retryable: true,
    severity: "transient",
    action: "retry",
  },
  "ai.sandbox_timeout": {
    i18nKey: "ai.error.sandbox_timeout",
    retryable: false,
    severity: "user",
    action: "split_query",
  },
  "ai.sandbox_output_too_large": {
    i18nKey: "ai.error.sandbox_output_too_large",
    retryable: false,
    severity: "user",
    action: "split_query",
  },
  "ai.rate_limited": {
    i18nKey: "ai.error.rate_limited",
    retryable: true,
    severity: "transient",
    action: "retry",
  },
  "ai.budget_exceeded": {
    i18nKey: "ai.error.budget_exceeded",
    retryable: false,
    severity: "user",
    action: "contact_admin",
  },
  "ai.quota_exceeded": {
    i18nKey: "ai.error.quota_exceeded",
    retryable: false,
    severity: "user",
    action: "contact_admin",
  },
  "ai.quota_unavailable": {
    i18nKey: "ai.error.quota_unavailable",
    retryable: true,
    severity: "transient",
    action: "retry",
  },
  "ai.approval_expired": {
    i18nKey: "ai.error.approval_expired",
    retryable: false,
    severity: "user",
    action: "contact_admin",
  },
  "ai.not_ready": {
    i18nKey: "ai.error.not_ready",
    retryable: true,
    severity: "transient",
    action: "retry",
  },
}

export function resolveAiError(code: string): AiErrorMeta {
  const normalized = code.trim().toLowerCase()
  if (AI_ERROR_MAP[normalized]) {
    return AI_ERROR_MAP[normalized]
  }

  // Handle substring/prefix matching if code was prefixed or formatted differently
  for (const [key, meta] of Object.entries(AI_ERROR_MAP)) {
    if (normalized.includes(key)) {
      return meta
    }
  }

  if (normalized.includes("429") || normalized.includes("rate limit")) {
    return AI_ERROR_MAP["ai.rate_limited"]
  }

  return {
    i18nKey: "ai.error.unknown",
    retryable: true,
    severity: "transient",
    action: "retry",
  }
}
