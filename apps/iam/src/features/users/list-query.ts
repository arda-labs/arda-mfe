import { defineServerList } from "@workspace/admin-list/server-list"

export const USERS_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for users. The toolbar search `username` is
 * remapped to the API `q` parameter; status is a single-select surfaced in the
 * table filters. Sort ids follow the BE whitelist (`created_at` snake_case).
 * Shared by the toolbar and any advanced-search form.
 */
export const usersListDefinition = defineServerList({
  queryKey: ["iam", "users", "list"] as const,
  queryConfig: {
    defaultPageSize: USERS_DEFAULT_PAGE_SIZE,
    sortableColumns: ["username", "email", "status", "created_at"],
    filters: [
      { urlKey: "username", apiKey: "q", mode: "text" },
      {
        urlKey: "status",
        mode: "single",
        allowedValues: ["ACTIVE", "DISABLED"],
      },
    ],
  },
} as const)
