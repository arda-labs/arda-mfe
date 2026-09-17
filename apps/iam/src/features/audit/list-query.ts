import { defineServerList } from "@workspace/list-page/server-list"

export const AUDIT_DEFAULT_PAGE_SIZE = 10

/** Event types accepted by `GET /api/admin/audit` (iam-service). */
export const AUDIT_EVENT_TYPES = [
  "login_attempt",
  "login_blocked",
  "session_created",
  "session_revoked",
  "token_issued",
  "token_refreshed",
  "permission_denied",
  "consent_granted",
] as const

/** Result values accepted by the audit query (`result=` is single-valued). */
export const AUDIT_RESULTS = [
  "success",
  "failure",
  "denied",
  "blocked",
] as const

/**
 * URL-synced server list contract for audit events. URL keys match the column
 * ids so the toolbar filters (`eventType`, `result`, `subject`) and the table
 * headers write the same search params; the page maps them onto the API
 * dialect (repeated `event_type`, single `result`, `subject`).
 */
export const auditListDefinition = defineServerList({
  queryKey: ["iam", "audit", "list"] as const,
  queryConfig: {
    defaultPageSize: AUDIT_DEFAULT_PAGE_SIZE,
    sortableColumns: ["timestamp"],
    filters: [
      {
        urlKey: "eventType",
        apiKey: "event_type",
        mode: "multi",
        allowedValues: AUDIT_EVENT_TYPES,
      },
      {
        urlKey: "result",
        apiKey: "result",
        mode: "single",
        allowedValues: AUDIT_RESULTS,
      },
      { urlKey: "subject", apiKey: "subject", mode: "text" },
    ],
  },
} as const)
