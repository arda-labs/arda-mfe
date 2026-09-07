import { defineServerList } from "@workspace/list-page/server-list"

export const ROLES_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for roles. The toolbar search `code` is remapped
 * to the API `q` parameter; status is surfaced in the table filters (BE
 * accepts a comma list via ANY). Sortable columns must equal the BE whitelist
 * keys exactly — a mismatch silently drops the sort.
 */
export const rolesListDefinition = defineServerList({
  queryKey: ["iam", "roles", "list"] as const,
  queryConfig: {
    defaultPageSize: ROLES_DEFAULT_PAGE_SIZE,
    sortableColumns: ["code", "name", "status"],
    filters: [
      { urlKey: "code", apiKey: "q", mode: "text" },
      {
        urlKey: "status",
        mode: "multi",
        allowedValues: ["ACTIVE", "DISABLED"],
      },
    ],
  },
} as const)