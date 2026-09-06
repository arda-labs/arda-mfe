import {
  deleteCanonical,
  getCanonical,
  getCanonicalList,
  postCanonical,
  putCanonical,
} from "@workspace/api"
import type { ApiRequestOptions } from "@workspace/api/client"

// ── Generic catalogs (attributes-based) ──

export interface MdmItem {
  id: string
  tenant_id?: string
  code: string
  name: string
  description?: string
  is_active: boolean
  attributes?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export const mdmCatalogs = [
  { key: "currencies", labelKey: "mdm.catalog.currencies" },
  { key: "countries", labelKey: "mdm.catalog.countries" },
  { key: "id-document-types", labelKey: "mdm.catalog.id_document_types" },
  { key: "collateral-types", labelKey: "mdm.catalog.collateral_types" },
  { key: "loan-purposes", labelKey: "mdm.catalog.loan_purposes" },
  { key: "fee-types", labelKey: "mdm.catalog.fee_types" },
  { key: "debt-groups", labelKey: "mdm.catalog.debt_groups" },
  { key: "economic-types", labelKey: "mdm.catalog.economic_types" },
  { key: "industries", labelKey: "mdm.catalog.industries" },
  { key: "loan-methods", labelKey: "mdm.catalog.loan_methods" },
  { key: "loan-contract-types", labelKey: "mdm.catalog.loan_contract_types" },
  { key: "fund-sources", labelKey: "mdm.catalog.fund_sources" },
  { key: "fund-purposes", labelKey: "mdm.catalog.fund_purposes" },
  { key: "base-rates", labelKey: "mdm.catalog.base_rates" },
  { key: "interest-factors", labelKey: "mdm.catalog.interest_factors" },
  { key: "cash-denominations", labelKey: "mdm.catalog.cash_denominations" },
  { key: "scoring-types", labelKey: "mdm.catalog.scoring_types" },
  {
    key: "scoring-indicator-groups",
    labelKey: "mdm.catalog.scoring_indicator_groups",
  },
  { key: "scoring-indicators", labelKey: "mdm.catalog.scoring_indicators" },
  { key: "scoring-benchmarks", labelKey: "mdm.catalog.scoring_benchmarks" },
] as const

export type MdmCatalogKey = (typeof mdmCatalogs)[number]["key"]

export const mdmApi = {
  listItems: (catalog: MdmCatalogKey, requestOptions?: ApiRequestOptions) =>
    getCanonicalList<MdmItem>(`/api/mdm/${catalog}?include_inactive=true&all=true`, requestOptions),
  createItem: (catalog: MdmCatalogKey, body: Partial<MdmItem>) =>
    postCanonical<MdmItem>(`/api/mdm/${catalog}`, body),
  updateItem: (catalog: MdmCatalogKey, id: string, body: Partial<MdmItem>) =>
    putCanonical<MdmItem>(`/api/mdm/${catalog}/${encodeURIComponent(id)}`, body),
  deleteItem: (catalog: MdmCatalogKey, id: string) =>
    deleteCanonical(`/api/mdm/${catalog}/${encodeURIComponent(id)}`),
}

// ── Interest rates (dedicated resource with tiered values) ──

export type InterestRateType = "central" | "loan" | "deposit"
export type InterestApplyType = "by_balance" | "by_term" | "negotiated"

export interface InterestRate {
  id: string
  tenant_id?: string
  code: string
  name: string
  rate_type: InterestRateType
  apply_type: InterestApplyType
  currency_code?: string
  description?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface InterestRateTier {
  id: string
  rate_id: string
  effective_from: string
  effective_to?: string
  amount_from_minor?: number
  amount_to_minor?: number
  rate_value: number
  min_rate?: number
  max_rate?: number
  decision_no?: string
  decision_date?: string
  created_at?: string
  updated_at?: string
}

export const interestRateApi = {
  list: (includeInactive = false, requestOptions?: ApiRequestOptions) =>
    getCanonicalList<InterestRate>(
      `/api/mdm/interest-rates?include_inactive=${includeInactive ? "true" : "false"}&all=true`,
      requestOptions
    ),
  create: (body: Partial<InterestRate>) =>
    postCanonical<InterestRate>("/api/mdm/interest-rates", body),
  update: (id: string, body: Partial<InterestRate>) =>
    putCanonical<InterestRate>(`/api/mdm/interest-rates/${encodeURIComponent(id)}`, body),
  listTiers: (rateId: string) =>
    getCanonical<InterestRateTier[]>(
      `/api/mdm/interest-rates/${encodeURIComponent(rateId)}/tiers`
    ),
  createTier: (rateId: string, body: Partial<InterestRateTier>) =>
    postCanonical<InterestRateTier>(
      `/api/mdm/interest-rates/${encodeURIComponent(rateId)}/tiers`,
      body
    ),
  updateTier: (rateId: string, tierId: string, body: Partial<InterestRateTier>) =>
    putCanonical<InterestRateTier>(
      `/api/mdm/interest-rates/${encodeURIComponent(rateId)}/tiers/${encodeURIComponent(tierId)}`,
      body
    ),
  deleteTier: (rateId: string, tierId: string) =>
    deleteCanonical(
      `/api/mdm/interest-rates/${encodeURIComponent(rateId)}/tiers/${encodeURIComponent(tierId)}`
    ),
}
