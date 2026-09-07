import { defineServerList } from "@workspace/list-page/server-list"

export const CONTRACTS_DEFAULT_PAGE_SIZE = 10

/**
 * URL-synced list contract for fund contracts. The toolbar search
 * `contract_code` maps to the BE `q` parameter (ILIKE contract_code +
 * counterparty_code + fund_type_code). Sortable columns equal the BE
 * whitelist keys (contract_code, contract_date, created_at).
 */
export const contractsListDefinition = defineServerList({
  queryKey: ["capital", "contracts", "list"] as const,
  queryConfig: {
    defaultPageSize: CONTRACTS_DEFAULT_PAGE_SIZE,
    sortableColumns: ["contract_code", "contract_date", "created_at"],
    filters: [{ urlKey: "contract_code", apiKey: "q", mode: "text" }],
  },
} as const)
