import { defineServerList } from "@workspace/list-page/server-list"

export const LOAN_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for credit contracts. BE contract list spec: q is
 * a SQL ILIKE over contract_no + customer_code, the sort whitelist is
 * created_at | contract_no | loan_amt_minor, and paging uses the standard
 * items/page/per_page/total envelope. sortableColumns matches the BE
 * whitelist 1:1 (a mismatch silently drops the sort). created_at has no
 * table column — it stays reachable through deep-link URL sort, like the
 * disbursements ledger.
 */
export const loanContractsListDefinition = defineServerList({
  queryKey: ["loan", "contracts", "list"] as const,
  queryConfig: {
    defaultPageSize: LOAN_DEFAULT_PAGE_SIZE,
    // Own URL namespace (contractPage/…) — deep-linked sort from the loans hub
    // must not clash with other list pages sharing the shell URL.
    queryKeys: { page: "contractPage", perPage: "contractPerPage", sort: "contractSort" },
    sortableColumns: ["created_at", "contract_no", "loan_amt_minor"],
    filters: [{ urlKey: "contract_no", apiKey: "q", mode: "text" }],
  },
} as const)
