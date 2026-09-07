import { defineServerList } from "@workspace/list-page/server-list"

export const MDM_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for every mdm catalog (served by one page keyed
 * by URL param — the current catalog is appended to the React Query key by
 * the page). The toolbar search `code` maps to the API `q` parameter; the
 * active filter is a boolean multi ("true"/"false") surfaced as
 * is_active=true|false. Sortable columns must equal the BE whitelist
 * (code | name | created_at) exactly — a mismatch silently drops the sort.
 */
export const mdmListDefinition = defineServerList({
  queryKey: ["mdm", "catalog", "list"] as const,
  queryConfig: {
    defaultPageSize: MDM_DEFAULT_PAGE_SIZE,
    sortableColumns: ["code", "name", "created_at"],
    filters: [
      { urlKey: "code", apiKey: "q", mode: "text" },
      {
        urlKey: "is_active",
        mode: "multi",
        allowedValues: ["true", "false"],
      },
    ],
  },
} as const)
