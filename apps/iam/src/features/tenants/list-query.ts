import { defineServerList } from "@workspace/list-page/server-list"

export const TENANTS_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for tenants. The toolbar search `code` is remapped
 * to the API `q` parameter (ILIKE on code/name); sort keys follow the API
 * snake_case columns (code/name/created_at). Shared by the toolbar and any
 * advanced-search form.
 */
export const tenantsListDefinition = defineServerList({
  queryKey: ["iam", "tenants", "list"] as const,
  queryConfig: {
    defaultPageSize: TENANTS_DEFAULT_PAGE_SIZE,
    filters: [{ urlKey: "code", apiKey: "q", mode: "text" }],
    sortableColumns: ["code", "name", "created_at"],
  },
} as const)
