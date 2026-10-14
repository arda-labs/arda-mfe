import { defineServerList } from "@workspace/list-page/server-list"

export const CONTRACTS_DEFAULT_PAGE_SIZE = 10

/** capital-service contract lifecycle, in the order a contract moves through it. */
export const CONTRACT_STATUSES = ["PENDING_APPROVAL", "ACTIVE", "REJECTED", "CLOSED"] as const

/**
 * URL-synced list contract for fund contracts. The toolbar search
 * `contract_code` maps to the BE `q` parameter (ILIKE contract_code +
 * counterparty_code + fund_type_code). Sortable columns equal the BE
 * whitelist keys (contract_code, contract_date, created_at). `status` is an
 * exact match on the BE (capital-service ListContracts), driven by the
 * work-queue tabs.
 */
export const contractsListDefinition = defineServerList({
  queryKey: ["capital", "contracts", "list"] as const,
  queryConfig: {
    defaultPageSize: CONTRACTS_DEFAULT_PAGE_SIZE,
    sortableColumns: ["contract_code", "contract_date", "created_at"],
    filters: [
      { urlKey: "contract_code", apiKey: "q", mode: "text" },
      { urlKey: "status", mode: "single", allowedValues: CONTRACT_STATUSES },
    ],
  },
} as const)
