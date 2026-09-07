import { defineServerList } from "@workspace/list-page/server-list"

export const VFU_DEFAULT_PAGE_SIZE = 10

/**
 * The three VFU catalogs share one URL, so every section owns a param
 * namespace (queryKeys) plus its own filter urlKeys — three server lists
 * never fight over ?page/?perPage/?sort. The BE whitelist is the generic
 * loanListSpec (code/name/amount/created_at) and the repos keep fixed
 * ORDER BYs, so no FE column sorts server-side (sortableColumns stays
 * empty and columns are non-sortable). q is applied in SQL by the parties
 * and mandates repos (code + name / code + party).
 */
export const vfuPartyListDefinition = defineServerList({
  queryKey: ["loan", "vfu", "parties", "list"] as const,
  queryConfig: {
    defaultPageSize: VFU_DEFAULT_PAGE_SIZE,
    queryKeys: { page: "partyPage", perPage: "partyPerPage", sort: "partySort" },
    sortableColumns: [],
    filters: [{ urlKey: "party_code", apiKey: "q", mode: "text" }],
  },
} as const)

export const vfuMandateListDefinition = defineServerList({
  queryKey: ["loan", "vfu", "mandates", "list"] as const,
  queryConfig: {
    defaultPageSize: VFU_DEFAULT_PAGE_SIZE,
    queryKeys: { page: "mandatePage", perPage: "mandatePerPage", sort: "mandateSort" },
    sortableColumns: [],
    filters: [{ urlKey: "mandate_code", apiKey: "q", mode: "text" }],
  },
} as const)

export const vfuPlanListDefinition = defineServerList({
  queryKey: ["loan", "vfu", "plans", "list"] as const,
  queryConfig: {
    defaultPageSize: VFU_DEFAULT_PAGE_SIZE,
    queryKeys: { page: "planPage", perPage: "planPerPage", sort: "planSort" },
    sortableColumns: [],
    filters: [
      // BE exposes exact-match mandate_code only (no q on plans); the
      // urlKey is namespaced (plan_mandate_code) to stay independent of the
      // mandates section's mandate_code filter.
      { urlKey: "plan_mandate_code", apiKey: "mandate_code", mode: "text" },
    ],
  },
} as const)
