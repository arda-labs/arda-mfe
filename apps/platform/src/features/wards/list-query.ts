import { defineServerList } from "@workspace/list-page/server-list"

export const WARDS_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for wards (geo admin units level 2, ~10k rows —
 * server tier). The toolbar search `code` is remapped to the API `q`
 * parameter (BE ILIKEs code + name). Sortable columns must equal the BE
 * whitelist keys exactly (code, name, created_at) — a mismatch silently
 * drops the sort.
 */
export const wardsListDefinition = defineServerList({
  queryKey: ["platform", "geo-admin-units", "wards", "list"] as const,
  queryConfig: {
    defaultPageSize: WARDS_DEFAULT_PAGE_SIZE,
    sortableColumns: ["code", "name", "created_at"],
    filters: [
      { urlKey: "code", apiKey: "q", mode: "text" },
      { urlKey: "parent_code", apiKey: "parentCode", mode: "single" },
    ],
  },
} as const)
