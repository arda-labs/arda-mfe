import { defineServerList } from "@workspace/list-page/server-list"

export const USERS_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for users. The toolbar search `username` is
 * remapped to the API `q` parameter; status is surfaced in the table filters
 * (BE accepts a comma list via ANY). Sort ids follow the BE whitelist
 * (`created_at` snake_case). Shared by the toolbar and any advanced-search
 * form.
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
        mode: "multi",
        allowedValues: ["ACTIVE", "DISABLED"],
      },
    ],
  },
} as const)
