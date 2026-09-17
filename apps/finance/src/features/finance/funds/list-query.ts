import { defineServerList } from "@workspace/list-page/server-list"

export const FUNDS_DEFAULT_PAGE_SIZE = 20

/** Fund actions — the tab value doubles as the BE document_type selector. */
export const FUND_TABS = ["APPROPRIATION", "UTILIZATION"] as const

export type FundTab = (typeof FUND_TABS)[number]

/** document_type written by each fund case flow (FIN_FUND_APPROP_V2 / FIN_FUND_USE_V2). */
export const FUND_DOCUMENT_TYPE: Record<FundTab, string> = {
  APPROPRIATION: "FIN_FUND_APPROP",
  UTILIZATION: "FIN_FUND_USE",
}

export function parseFundTab(value: unknown): FundTab {
  return value === "UTILIZATION" ? "UTILIZATION" : "APPROPRIATION"
}

/**
 * URL-synced list contract for the fund journal (appropriation / utilization).
 * `?tab=` drives both the active tab and the pinned `document_type` filter;
 * sortable columns must equal the BE whitelist (entry_no | accounting_date)
 * exactly — everything else renders a plain header.
 */
export const fundsListDefinition = defineServerList({
  queryKey: ["finance", "funds", "list"] as const,
  queryConfig: {
    defaultPageSize: FUNDS_DEFAULT_PAGE_SIZE,
    sortableColumns: ["entry_no", "accounting_date"],
    filters: [
      {
        urlKey: "tab",
        apiKey: "tab",
        mode: "single",
        allowedValues: FUND_TABS,
      },
    ],
  },
} as const)
