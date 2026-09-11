import { getCanonical, getCanonicalList, postCanonical, putCanonical, deleteCanonical } from "@workspace/api"

export interface FundType {
  id: string
  tenant_id: string
  code: string
  name: string
  is_active: boolean
}

export interface CapitalProduct {
  id: string
  tenant_id: string
  code: string
  name: string
  fund_type_code: string
  term_months: number
  interest_rate: number
  currency_code: string
  is_active: boolean
}

export interface CapitalContract {
  id: string
  tenant_id: string
  contract_code: string
  fund_type_code: string
  product_code?: string
  counterparty_code: string
  contract_date: string
  maturity_date?: string
  amount_minor: number
  interest_rate: number
  currency_code: string
  status: string
  org_code?: string
  workflow_case_id?: string
  journal_entry_id?: string
  created_by: string
  created_at?: string
}

export interface CapitalMovement {
  id: string
  tenant_id: string
  contract_id: string
  movement_type: string
  amount_minor: number
  currency_code: string
  movement_date: string
  note?: string
  status: string
  workflow_case_id?: string
  journal_entry_id?: string
  created_by: string
  created_at?: string
}

export interface ContractAmendment {
  id: string
  contract_id: string
  status: string
  payload: Record<string, unknown>
  reason?: string
  workflow_case_id?: string
  created_by: string
  created_at?: string
}

export interface ContractDetail {
  contract: CapitalContract
  fund_type?: FundType
  product?: CapitalProduct
  movements: CapitalMovement[]
  amendments: ContractAmendment[]
}

/** Report rows (W4c, data owner computes). */
export interface FundSourceStatementRow {
  contract_code: string
  fund_type_code: string
  counterparty_code: string
  contract_date: string
  maturity_date?: string
  amount_minor: number
  interest_rate: number
  currency_code: string
  status: string
}

export interface FundSourceTxnRow {
  movement_date: string
  contract_code: string
  movement_type: string
  amount_minor: number
  currency_code: string
  note?: string
  status: string
}

export const capitalApi = {
  listFundTypes: (includeInactive = false) =>
    getCanonicalList<FundType>(
      `/api/capital/fund-types${includeInactive ? "?include_inactive=true" : ""}`
    ),
  createFundType: (body: { code: string; name: string }) =>
    postCanonical<FundType>("/api/capital/fund-types", body),
  updateFundType: (id: string, body: { name: string; is_active: boolean }) =>
    putCanonical<FundType>(`/api/capital/fund-types/${encodeURIComponent(id)}`, body),
  deactivateFundType: (id: string) =>
    deleteCanonical<{ ok: boolean }>(`/api/capital/fund-types/${encodeURIComponent(id)}`),

  listProducts: (includeInactive = false) =>
    getCanonicalList<CapitalProduct>(
      `/api/capital/products${includeInactive ? "?include_inactive=true" : ""}`
    ),
  upsertProduct: (body: Partial<CapitalProduct>) =>
    postCanonical<CapitalProduct>("/api/capital/products", body),

  listContracts: (params: {
    status?: string
    q?: string
    sort?: string
    order?: string
    page?: number
    perPage?: number
  } = {}) => {
    const search = new URLSearchParams()
    if (params.status) search.set("status", params.status)
    if (params.q) search.set("q", params.q)
    if (params.sort) search.set("sort", params.sort)
    if (params.order) search.set("order", params.order)
    if (params.page !== undefined) search.set("page", String(params.page))
    if (params.perPage !== undefined) search.set("per_page", String(params.perPage))
    const qs = search.toString()
    return getCanonicalList<CapitalContract>(`/api/capital/contracts${qs ? `?${qs}` : ""}`)
  },
  getContract: (id: string) =>
    getCanonical<ContractDetail>(`/api/capital/contracts/${encodeURIComponent(id)}`),
  createContract: (body: Partial<CapitalContract>) =>
    postCanonical<CapitalContract>("/api/capital/contracts", body),
  submitAmendment: (
    contractId: string,
    body: { payload: Record<string, unknown>; reason?: string }
  ) =>
    postCanonical<ContractAmendment>(
      `/api/capital/contracts/${encodeURIComponent(contractId)}/amendments`,
      body
    ),
  recordMovement: (
    contractId: string,
    body: {
      movement_type: string
      amount_minor: number
      currency_code?: string
      movement_date: string
      note?: string
    }
  ) =>
    postCanonical<CapitalMovement>(
      `/api/capital/contracts/${encodeURIComponent(contractId)}/movements`,
      body
    ),

  fundSourceStatement: (params: { from?: string; to?: string; status?: string } = {}) =>
    getCanonicalList<FundSourceStatementRow>(
      `/api/capital/reports/fund-source-statement${reportQuery(params)}`
    ),
  fundSourceTransactions: (params: { from?: string; to?: string; movement_type?: string } = {}) =>
    getCanonicalList<FundSourceTxnRow>(
      `/api/capital/reports/fund-source-transactions${reportQuery(params)}`
    ),
}

function reportQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ""
}
