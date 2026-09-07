import { defineServerList } from "@workspace/list-page/server-list"

export const DISBURSEMENTS_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for the disbursements ledger (LNM.300.02). BE
 * disbursementListSpec: sort in {agreement_code, contract_code,
 * disburse_date, created_at}; q is a SQL ILIKE over agreement_code +
 * contract_code; status is accepted but not surfaced as a table filter
 * (submit state transitions via the workbench). Column ids equal the BE
 * whitelist keys 1:1.
 */
export const disbursementsListDefinition = defineServerList({
  queryKey: ["loan", "disbursements", "list"] as const,
  queryConfig: {
    defaultPageSize: DISBURSEMENTS_DEFAULT_PAGE_SIZE,
    sortableColumns: ["agreement_code", "contract_code", "disburse_date", "created_at"],
    filters: [
      { urlKey: "agreement_code", apiKey: "q", mode: "text" },
      {
        urlKey: "status",
        mode: "single",
        allowedValues: ["DRAFT", "SUBMITTED", "APPROVED", "POSTED", "REJECTED", "CANCELLED"],
      },
    ],
  },
} as const)
