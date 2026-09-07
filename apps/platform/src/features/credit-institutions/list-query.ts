import { defineServerList } from "@workspace/list-page/server-list"

export const CREDIT_INSTITUTIONS_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for credit institutions (server tier). The toolbar
 * search `code` is remapped to the API `q` parameter (BE ILIKEs code, name,
 * short_name, tax_code, license_no). Sortable columns must equal the BE
 * whitelist keys exactly (code, name, status, created_at) — a mismatch
 * silently drops the sort.
 */
export const creditInstitutionsListDefinition = defineServerList({
  queryKey: ["platform", "credit-institutions", "list"] as const,
  queryConfig: {
    defaultPageSize: CREDIT_INSTITUTIONS_DEFAULT_PAGE_SIZE,
    sortableColumns: ["code", "name", "status", "created_at"],
    filters: [
      { urlKey: "code", apiKey: "q", mode: "text" },
      {
        urlKey: "status",
        mode: "multi",
        allowedValues: ["active", "inactive"],
      },
    ],
  },
} as const)
