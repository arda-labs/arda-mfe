import { defineServerList } from "@workspace/list-page/server-list"

export const INDICATORS_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for the indicator catalog. The toolbar search
 * `code` maps to the BE `q` parameter (ILIKE code + name); sortable columns
 * must equal the BE whitelist keys exactly (code, name, created_at).
 */
export const indicatorsListDefinition = defineServerList({
  queryKey: ["statistical", "indicators", "list"] as const,
  queryConfig: {
    defaultPageSize: INDICATORS_DEFAULT_PAGE_SIZE,
    sortableColumns: ["code", "name", "created_at"],
    filters: [{ urlKey: "code", apiKey: "q", mode: "text" }],
  },
} as const)
