import { defineServerList } from "@workspace/list-page/server-list"

export const JOB_TITLES_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for hrm job titles. The toolbar search `code` is
 * remapped to the API `q` parameter (BE ILIKEs code + name). Job titles have
 * no status column, so no status filter here. Sortable columns must equal
 * the BE whitelist keys exactly — a mismatch silently drops the sort.
 */
export const jobTitlesListDefinition = defineServerList({
  queryKey: ["hrm", "job-titles", "list"] as const,
  queryConfig: {
    defaultPageSize: JOB_TITLES_DEFAULT_PAGE_SIZE,
    sortableColumns: ["code", "name", "created_at"],
    filters: [{ urlKey: "code", apiKey: "q", mode: "text" }],
  },
} as const)
