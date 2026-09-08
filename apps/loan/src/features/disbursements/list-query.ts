import { defineServerList } from "@workspace/list-page/server-list"

export const DISBURSEMENTS_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for the disbursements ledger (LNM.300.02). BE
 * disbursementListSpec: sort in {agreement_code, contract_code,
 * disburse_date, created_at}; q is a SQL ILIKE over agreement_code +
 * contract_code; status + flow_type (P1b v2 REGISTER/COMPLETE) are accepted
 * as single-select filters. Column ids equal the BE whitelist keys 1:1.
 * flow_type is NOT in the BE sort whitelist — never add it to sortableColumns.
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
      {
        urlKey: "flow_type",
        mode: "single",
        allowedValues: ["REGISTER", "COMPLETE"],
      },
    ],
  },
} as const)
