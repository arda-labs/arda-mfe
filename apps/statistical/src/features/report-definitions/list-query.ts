import { defineServerList } from "@workspace/list-page/server-list"

export const REPORT_DEFINITIONS_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for report definitions. Search maps to BE `q`
 * (ILIKE code + name); sortable columns equal the BE whitelist keys
 * (code, name, created_at).
 */
export const reportDefinitionsListDefinition = defineServerList({
  queryKey: ["statistical", "report-definitions", "list"] as const,
  queryConfig: {
    defaultPageSize: REPORT_DEFINITIONS_DEFAULT_PAGE_SIZE,
    sortableColumns: ["code", "name", "created_at"],
    filters: [{ urlKey: "code", apiKey: "q", mode: "text" }],
  },
} as const)
