import { defineServerList } from "@workspace/list-page/server-list"

export const ACCOUNTS_DEFAULT_PAGE_SIZE = 20

/**
 * URL-synced list contract for the chart of accounts. The toolbar search
 * `code` maps to the API `q` parameter (BE ILIKEs code+name together); the
 * status column is display-only — the accounts endpoint has no filter param
 * yet. Sortable columns must equal the BE whitelist (code | name |
 * created_at) exactly — a mismatch silently drops the sort.
 */
export const accountsListDefinition = defineServerList({
  queryKey: ["finance", "accounts", "list"] as const,
  queryConfig: {
    defaultPageSize: ACCOUNTS_DEFAULT_PAGE_SIZE,
    sortableColumns: ["code", "name", "created_at"],
    filters: [{ urlKey: "code", apiKey: "q", mode: "text" }],
  },
} as const)
