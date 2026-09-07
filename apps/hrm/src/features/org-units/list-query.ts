import { defineServerList } from "@workspace/list-page/server-list"

export const ORG_UNITS_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for hrm org units. The toolbar search `code` is
 * remapped to the API `q` parameter (BE ILIKEs code + name); status is
 * surfaced as a multi filter (BE accepts a comma list via ANY). Sortable
 * columns must equal the BE whitelist keys exactly — a mismatch silently
 * drops the sort (unknown sorts fall back to the tree order server-side).
 */
export const orgUnitsListDefinition = defineServerList({
  queryKey: ["hrm", "org-units", "list"] as const,
  queryConfig: {
    defaultPageSize: ORG_UNITS_DEFAULT_PAGE_SIZE,
    sortableColumns: ["code", "name", "status", "org_level", "created_at"],
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
