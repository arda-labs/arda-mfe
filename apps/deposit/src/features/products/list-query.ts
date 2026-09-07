import { defineServerList } from "@workspace/list-page/server-list"

export const PRODUCTS_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for the deposit product catalog. The toolbar
 * search `code` maps to the BE `q` parameter (ILIKE code + name); `is_active`
 * is a boolean filter sent as "true"/"false". Sortable columns equal the BE
 * whitelist keys (code, name, created_at).
 */
export const productsListDefinition = defineServerList({
  queryKey: ["deposit", "products", "list"] as const,
  queryConfig: {
    defaultPageSize: PRODUCTS_DEFAULT_PAGE_SIZE,
    sortableColumns: ["code", "name", "created_at"],
    filters: [
      { urlKey: "code", apiKey: "q", mode: "text" },
      { urlKey: "is_active", apiKey: "is_active", mode: "single" },
    ],
  },
} as const)
