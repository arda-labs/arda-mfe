import { defineServerList } from "@workspace/admin-list/server-list"

export const ORGANIZATIONS_DEFAULT_PAGE_SIZE = 10

/** Shared by the table toolbar and any external advanced-search form. */
export const organizationsListDefinition = defineServerList({
  queryKey: ["platform", "organizations", "list"],
  queryConfig: {
    defaultPageSize: ORGANIZATIONS_DEFAULT_PAGE_SIZE,
    sortableColumns: ["code", "name", "is_active"],
    filters: [
      { urlKey: "q", apiKey: "q", mode: "text" },
      { urlKey: "name", apiKey: "q", mode: "text" },
      {
        urlKey: "is_active",
        mode: "single",
        allowedValues: ["true", "false"],
      },
    ],
  },
} as const)
