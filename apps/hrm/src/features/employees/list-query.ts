import { defineServerList } from "@workspace/list-page/server-list"

export const EMPLOYEES_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for hrm employees. The toolbar search
 * `employee_code` is remapped to the API `q` parameter (BE ILIKEs
 * employee_code + full_name); status is surfaced as a multi filter (BE
 * accepts a comma list via ANY). Sortable columns must equal the BE
 * whitelist keys exactly — a mismatch silently drops the sort.
 */
export const employeesListDefinition = defineServerList({
  queryKey: ["hrm", "employees", "list"] as const,
  queryConfig: {
    defaultPageSize: EMPLOYEES_DEFAULT_PAGE_SIZE,
    sortableColumns: ["employee_code", "full_name", "created_at"],
    filters: [
      { urlKey: "employee_code", apiKey: "q", mode: "text" },
      {
        urlKey: "status",
        mode: "multi",
        allowedValues: ["active", "inactive"],
      },
    ],
  },
} as const)
