import { defineServerList } from "@workspace/list-page/server-list"

/**
 * Client-paged catalog list (fund types / products). The BE endpoints return
 * the full canonical list (no server paging); the table pages locally.
 */
export const catalogsListDefinition = defineServerList({
  queryKey: ["capital", "catalogs", "list"] as const,
  queryConfig: {
    defaultPageSize: 10,
    sortableColumns: ["code", "name"],
    filters: [],
  },
} as const)
