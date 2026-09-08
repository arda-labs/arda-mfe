import { getCanonicalList, postCanonical } from "@workspace/api"
import { buildSearchParams, type SearchParams } from "@workspace/api/query"

/**
 * Builds list query params. Server-paged calls (page set) never send
 * `all`; legacy fetch-all callers (dropdown lookups) keep all=true.
 */
function listQuery(params: SearchParams = {}) {
  const search = buildSearchParams(params)
  if (params.page === undefined) search.set("all", "true")
  return search
}

export interface LoanContract {
  id: string
  tenant_id: string
  contract_code: string
  contract_no?: string
  customer_code: string
  product_code?: string
  contract_type_code?: string
  interest_rate?: number
  loan_amt_minor: number
  loan_term?: number
  term_unit?: string
  maturity_date?: string
  status: string
  workflow_case_id?: string
  created_at?: string
}

export interface LoanAdjustment {
  id: string
  tenant_id: string
  kind: string
  contract_code: string
  agreement_code?: string
  effective_date?: string
  amount_minor?: number
  status: string
  workflow_case_id?: string
  decision_note?: string
  created_at?: string
}

export const loanAdjustmentKinds = [
  { key: "debt-change", labelKey: "loan.kind.debt_change" },
  { key: "rate-change", labelKey: "loan.kind.rate_change" },
  { key: "restructure", labelKey: "loan.kind.restructure" },
  { key: "waiver", labelKey: "loan.kind.waiver" },
  { key: "writeoff", labelKey: "loan.kind.writeoff" },
  { key: "recovery", labelKey: "loan.kind.recovery" },
  { key: "fund-check", labelKey: "loan.kind.fund_check" },
  { key: "revenue-allocation", labelKey: "loan.kind.revenue_allocation" },
  { key: "vfu-fee-allocation", labelKey: "loan.kind.vfu_fee_allocation" },
  { key: "off-balance-export", labelKey: "loan.kind.off_balance_export" },
] as const

export type LoanAdjustmentKind = (typeof loanAdjustmentKinds)[number]["key"]

export const loanApi = {
  listContracts: (
    params: {
      q?: string
      status?: string
      page?: number
      per_page?: number
      sort?: string
      order?: "asc" | "desc"
    } = {}
  ) =>
    getCanonicalList<LoanContract>(
      `/api/loan/contracts?${listQuery(params).toString()}`
    ),
  submitContract: (id: string) =>
    postCanonical<LoanContract>(`/api/loan/contracts/${encodeURIComponent(id)}/submit`, {}),
  createContract: (body: Partial<LoanContract>) =>
    postCanonical<LoanContract>("/api/loan/contracts", body),
  listAdjustments: (
    kind: LoanAdjustmentKind,
    params: { contract_code?: string; status?: string } = {}
  ) => {
    const search = listQuery({
      contract_code: params.contract_code,
      status: params.status,
    })
    return getCanonicalList<LoanAdjustment>(
      `/api/loan/adjustments/${kind}?${search.toString()}`
    )
  },
  createAdjustment: (
    kind: LoanAdjustmentKind,
    body: Partial<LoanAdjustment> & { payload?: Record<string, unknown> }
  ) => postCanonical<LoanAdjustment>(`/api/loan/adjustments/${kind}`, body),
  submitAdjustment: (kind: LoanAdjustmentKind, id: string) =>
    postCanonical<LoanAdjustment>(
      `/api/loan/adjustments/${kind}/${encodeURIComponent(id)}/submit`,
      {}
    ),
}

// ── Products ──

export interface LoanProduct {
  id: string
  tenant_id: string
  code: string
  name: string
  product_type: "TERM" | "LIMIT"
  currency_code: string
  interest_rate_code?: string
  interest_rate?: number
  loan_term_from?: number
  loan_term_to?: number
  term_unit: string
  min_amount_minor?: number
  max_amount_minor?: number
  acc_classification?: string
  is_active: boolean
  description?: string
  created_at?: string
}

export const productApi = {
  listProducts: (
    params: {
      include_inactive?: boolean
      is_active?: string
      q?: string
      page?: number
      per_page?: number
      sort?: string
      order?: "asc" | "desc"
    } = {}
  ) =>
    getCanonicalList<LoanProduct>(
      `/api/loan/products?${listQuery(params).toString()}`
    ),
  upsertProduct: (body: Partial<LoanProduct>) =>
    postCanonical<LoanProduct>("/api/loan/products", body),
}

// ── VFU (ủy thác) ──

export interface VfuParty {
  id: string
  tenant_id: string
  party_code: string
  party_name: string
  party_type: "ORG" | "PERSON"
  identification_id?: string
  mobile_number?: string
  status: string
  created_at?: string
}

export interface VfuMandate {
  id: string
  tenant_id: string
  mandate_code: string
  mandate_no?: string
  mandate_date?: string
  party_code: string
  rep_name?: string
  bank_name?: string
  bank_account?: string
  fee_payment_freq?: string
  rate_value?: number
  status: string
  created_at?: string
}

export interface VfuPlan {
  id: string
  tenant_id: string
  plan_code: string
  plan_date?: string
  mandate_code: string
  contract_code?: string
  allocated_amt_minor: number
  settled_amt_minor: number
  fee_amt_minor: number
  status: string
  created_at?: string
}

export const vfuApi = {
  listParties: (
    params: {
      q?: string
      page?: number
      per_page?: number
      sort?: string
      order?: "asc" | "desc"
    } = {}
  ) =>
    getCanonicalList<VfuParty>(
      `/api/loan/vfu/parties?${listQuery(params).toString()}`
    ),
  createParty: (body: Partial<VfuParty>) =>
    postCanonical<VfuParty>("/api/loan/vfu/parties", body),
  listMandates: (
    params: {
      q?: string
      page?: number
      per_page?: number
      sort?: string
      order?: "asc" | "desc"
    } = {}
  ) =>
    getCanonicalList<VfuMandate>(
      `/api/loan/vfu/mandates?${listQuery(params).toString()}`
    ),
  createMandate: (body: Partial<VfuMandate>) =>
    postCanonical<VfuMandate>("/api/loan/vfu/mandates", body),
  listPlans: (
    params: {
      mandate_code?: string
      page?: number
      per_page?: number
      sort?: string
      order?: "asc" | "desc"
    } = {}
  ) =>
    getCanonicalList<VfuPlan>(
      `/api/loan/vfu/plans?${listQuery(params).toString()}`
    ),
  createPlan: (body: Partial<VfuPlan>) =>
    postCanonical<VfuPlan>("/api/loan/vfu/plans", body),
}

// ── Disbursements (P1b, LNM.300.02) ──

/**
 * P1b v2 flow split: REGISTER = khởi tạo giải ngân (phiếu gốc),
 * COMPLETE = hoàn tất giải ngân (rút theo phiếu REGISTER đã POSTED).
 */
export type LoanDisbursementFlowType = "REGISTER" | "COMPLETE"

export interface LoanDisbursement {
  id: string
  tenant_id: string
  contract_code: string
  agreement_code: string
  disburse_date: string
  disburse_amt_minor: number
  currency_code: string
  fund_source_code: string
  status: string
  workflow_case_id?: string
  journal_entry_id?: string
  created_by: string
  created_at?: string
  flow_type?: LoanDisbursementFlowType
  /** Chỉ có trên row COMPLETE: id phiếu REGISTER gốc (POSTED, cùng agreement). */
  source_register_id?: string
}

export const disbursementApi = {
  list: (
    params: {
      status?: string
      contract_code?: string
      flow_type?: LoanDisbursementFlowType
      q?: string
      page?: number
      per_page?: number
      sort?: string
      order?: "asc" | "desc"
    } = {}
  ) =>
    getCanonicalList<LoanDisbursement>(
      `/api/loan/disbursements?${buildSearchParams(params).toString()}`
    ),
  create: (body: Partial<LoanDisbursement>) =>
    postCanonical<LoanDisbursement>("/api/loan/disbursements", body),
  submit: (id: string) =>
    postCanonical<LoanDisbursement>(`/api/loan/disbursements/${encodeURIComponent(id)}/submit`, {}),
}

// ── Collections (P1b.4, LNM.301.02) ──

export interface LoanCollection {
  id: string
  tenant_id: string
  contract_code: string
  agreement_code: string
  collection_date: string
  principal_minor: number
  interest_minor: number
  currency_code: string
  status: string
  workflow_case_id?: string
  journal_entry_id?: string
  created_by: string
  created_at?: string
}

export const collectionApi = {
  list: (
    params: {
      status?: string
      contract_code?: string
      q?: string
      page?: number
      per_page?: number
      sort?: string
      order?: "asc" | "desc"
    } = {}
  ) =>
    getCanonicalList<LoanCollection>(
      `/api/loan/collections?${buildSearchParams(params).toString()}`
    ),
  create: (body: Partial<LoanCollection>) =>
    postCanonical<LoanCollection>("/api/loan/collections", body),
  submit: (id: string) =>
    postCanonical<LoanCollection>(`/api/loan/collections/${encodeURIComponent(id)}/submit`, {}),
}
