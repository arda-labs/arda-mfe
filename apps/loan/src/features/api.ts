import { getCanonicalList, postCanonical } from "@workspace/api"
import { buildSearchParams } from "@workspace/api/query"

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
  listContracts: (params: { q?: string; status?: string } = {}) => {
    const search = buildSearchParams({ q: params.q, status: params.status })
    search.set("all", "true")
    return getCanonicalList<LoanContract>(`/api/loan/contracts?${search.toString()}`)
  },
  submitContract: (id: string) =>
    postCanonical<LoanContract>(`/api/loan/contracts/${encodeURIComponent(id)}/submit`, {}),
  createContract: (body: Partial<LoanContract>) =>
    postCanonical<LoanContract>("/api/loan/contracts", body),
  listAdjustments: (
    kind: LoanAdjustmentKind,
    params: { contract_code?: string; status?: string } = {}
  ) => {
    const search = buildSearchParams({
      contract_code: params.contract_code,
      status: params.status,
    })
    search.set("all", "true")
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
  listProducts: (includeInactive = false) =>
    getCanonicalList<LoanProduct>(
      `/api/loan/products?all=true${includeInactive ? "&include_inactive=true" : ""}`
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
  listParties: (q = "") => {
    const qs = q ? `&q=${encodeURIComponent(q)}` : ""
    return getCanonicalList<VfuParty>(`/api/loan/vfu/parties?all=true${qs}`)
  },
  createParty: (body: Partial<VfuParty>) =>
    postCanonical<VfuParty>("/api/loan/vfu/parties", body),
  listMandates: (q = "") => {
    const qs = q ? `&q=${encodeURIComponent(q)}` : ""
    return getCanonicalList<VfuMandate>(`/api/loan/vfu/mandates?all=true${qs}`)
  },
  createMandate: (body: Partial<VfuMandate>) =>
    postCanonical<VfuMandate>("/api/loan/vfu/mandates", body),
  listPlans: (mandateCode = "") => {
    const qs = mandateCode ? `&mandate_code=${encodeURIComponent(mandateCode)}` : ""
    return getCanonicalList<VfuPlan>(`/api/loan/vfu/plans?all=true${qs}`)
  },
  createPlan: (body: Partial<VfuPlan>) =>
    postCanonical<VfuPlan>("/api/loan/vfu/plans", body),
}
