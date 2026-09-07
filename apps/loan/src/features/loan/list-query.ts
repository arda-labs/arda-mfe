import { defineServerList } from "@workspace/list-page/server-list"

export const LOAN_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for credit contracts. BE loanListSpec whitelist
 * covers code/name/amount/created_at, but the repo only ORDER BYs
 * created_at today — restricting the FE to created_at keeps the sort
 * contract honest (sortableColumns must match the effective BE behavior
 * 1:1). q filters contract_code/contract_no/customer_code in SQL.
 */
export const loanContractsListDefinition = defineServerList({
  queryKey: ["loan", "contracts", "list"] as const,
  queryConfig: {
    defaultPageSize: LOAN_DEFAULT_PAGE_SIZE,
    // Own URL namespace: the adjustments sub-table (client tier) shares the
    // page and reads the default ?page/?perPage/?sort keys.
    queryKeys: { page: "contractPage", perPage: "contractPerPage", sort: "contractSort" },
    sortableColumns: ["created_at"],
    filters: [{ urlKey: "contract_code", apiKey: "q", mode: "text" }],
  },
} as const)
