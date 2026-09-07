import { defineServerList } from "@workspace/admin-list/server-list"

export const PERMISSIONS_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for permissions. The toolbar search `module` is
 * remapped to the API `q` parameter (ILIKE on module/resource/action).
 * Shared by the toolbar and any advanced-search form.
 */
export const permissionsListDefinition = defineServerList({
  queryKey: ["iam", "permissions", "list"] as const,
  queryConfig: {
    defaultPageSize: PERMISSIONS_DEFAULT_PAGE_SIZE,
    filters: [{ urlKey: "module", apiKey: "q", mode: "text" }],
    sortableColumns: ["module", "resource", "action"],
  },
} as const)
