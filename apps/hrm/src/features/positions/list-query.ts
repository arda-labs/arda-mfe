import { defineServerList } from "@workspace/list-page/server-list"

export const POSITIONS_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for hrm positions. The toolbar search `code` is
 * remapped to the API `q` parameter (BE ILIKEs code + name); status is
 * surfaced as a multi filter (BE accepts a comma list via ANY). Sortable
 * columns must equal the BE whitelist keys exactly — a mismatch silently
 * drops the sort.
 */
export const positionsListDefinition = defineServerList({
  queryKey: ["hrm", "positions", "list"] as const,
  queryConfig: {
    defaultPageSize: POSITIONS_DEFAULT_PAGE_SIZE,
    sortableColumns: ["code", "name", "status", "created_at"],
    filters: [
      { urlKey: "code", apiKey: "q", mode: "text" },
      {
        urlKey: "status",
        mode: "multi",
        allowedValues: ["active", "inactive"],
      },
    ],
  },
} as const)
