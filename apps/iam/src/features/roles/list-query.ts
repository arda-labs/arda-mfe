import { defineServerList } from "@workspace/admin-list/server-list"

export const ROLES_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for roles. The toolbar search `code` is remapped to
 * the API `q` parameter; status is a single-select surfaced in the table
 * filters. Shared by the toolbar and any advanced-search form.
 */
export const rolesListDefinition = defineServerList({
  queryKey: ["iam", "roles", "list"] as const,
  queryConfig: {
    defaultPageSize: ROLES_DEFAULT_PAGE_SIZE,
    filters: [
      { urlKey: "code", apiKey: "q", mode: "text" },
      {
        urlKey: "status",
        mode: "single",
        allowedValues: ["ACTIVE", "DISABLED"],
      },
    ],
  },
} as const)