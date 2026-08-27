import { defineServerList } from "@workspace/admin-list/server-list"

export const GROUPS_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for groups. The toolbar search `code` is remapped
 * to the API `q` parameter; status is selected in the table filters. Shared by
 * the toolbar and any advanced-search form.
 */
export const groupsListDefinition = defineServerList({
  queryKey: ["iam", "groups", "list"] as const,
  queryConfig: {
    defaultPageSize: GROUPS_DEFAULT_PAGE_SIZE,
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