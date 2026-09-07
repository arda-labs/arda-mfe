import { defineServerList } from "@workspace/list-page/server-list"

export const SUBMISSIONS_DEFAULT_PAGE_SIZE = 10

export const SUBMISSION_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
] as const

/**
 * URL-synced list contract for report submissions. `report_code` maps to the
 * BE `q` param (ILIKE report_code + period_code); status is a multi-select
 * filter sent as a comma list (BE: status = ANY(string_to_array(...))).
 */
export const submissionsListDefinition = defineServerList({
  queryKey: ["statistical", "submissions", "list"] as const,
  queryConfig: {
    defaultPageSize: SUBMISSIONS_DEFAULT_PAGE_SIZE,
    sortableColumns: ["report_code", "period_code", "status", "created_at"],
    filters: [
      { urlKey: "report_code", apiKey: "report_code", mode: "text" },
      { urlKey: "period_code", apiKey: "period_code", mode: "text" },
      {
        urlKey: "status",
        apiKey: "status",
        mode: "multi",
        allowedValues: SUBMISSION_STATUSES,
      },
    ],
  },
} as const)
