import { defineServerList } from "@workspace/list-page/server-list"

export const INTEREST_RATES_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for interest-rate tables. The toolbar search
 * `code` maps to the API `q` parameter; the active filter is a boolean
 * multi ("true"/"false"). Sortable columns must equal the BE whitelist
 * (code | name | created_at) exactly — a mismatch silently drops the sort.
 */
export const interestRatesListDefinition = defineServerList({
  queryKey: ["mdm", "interest-rates", "list"] as const,
  queryConfig: {
    defaultPageSize: INTEREST_RATES_DEFAULT_PAGE_SIZE,
    sortableColumns: ["code", "name", "created_at"],
    filters: [
      { urlKey: "code", apiKey: "q", mode: "text" },
      {
        urlKey: "is_active",
        mode: "multi",
        allowedValues: ["true", "false"],
      },
    ],
  },
} as const)
