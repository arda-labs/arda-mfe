import { defineServerList } from "@workspace/list-page/server-list"

export const AREAS_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for areas (server tier). The toolbar search
 * `code` is remapped to the API `q` parameter (BE ILIKEs code + name +
 * description). Sortable columns must equal the BE whitelist keys exactly
 * (code, name, area_type_code, status, created_at) — a mismatch silently
 * drops the sort.
 */
export const areasListDefinition = defineServerList({
  queryKey: ["platform", "areas", "list"] as const,
  queryConfig: {
    defaultPageSize: AREAS_DEFAULT_PAGE_SIZE,
    sortableColumns: [
      "code",
      "name",
      "area_type_code",
      "status",
      "created_at",
    ],
    filters: [
      { urlKey: "code", apiKey: "q", mode: "text" },
      { urlKey: "area_type_code", mode: "single" },
      {
        urlKey: "status",
        mode: "multi",
        allowedValues: ["active", "inactive"],
      },
    ],
  },
} as const)
