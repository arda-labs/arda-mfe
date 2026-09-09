import { getCanonical, getCanonicalList, postCanonical, putCanonical } from "@workspace/api"
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

/**
 * Credit contract header — mirrors loan-service `domain.Contract`
 * (internal/domain/loan.go). The BE list/get/submit responses all carry the
 * full row, including `workflow_case_id` once the formation case exists
 * (SubmitContract sets it together with status PENDING). `workflow_case_code`
 * is the friendly human-readable case code (e.g. LOAN-20260909-000123).
 */
export interface LoanContract {
  id: string
  tenant_id: string
  contract_code: string
  contract_no?: string
  customer_code: string
  product_code?: string
  contract_type_code?: string
  /** Đơn vị quản lý (BE employee_code — used as org_unit_code in postings). */
  employee_code?: string
  /** Annual rate, percent number (e.g. 8.5). */
  interest_rate?: number
  interest_rate_type?: string
  /** YYYY-MM-DD. */
  contract_date?: string
  loan_amt_minor: number
  loan_term?: number
  term_unit?: string
  /** YYYY-MM-DD. */
  maturity_date?: string
  status: string
  workflow_case_id?: string
  workflow_case_code?: string
  created_by?: string
  created_at?: string
  updated_at?: string
}

/**
 * Loan adjustment row — mirrors loan-service `domain.Adjustment`
 * (internal/domain/loan.go:179-195). Flow-specific data lives in `payload`
 * (jsonb) — the exact keys per kind are enforced BE-side by
 * `validateKindPayload` (internal/service/adjustment_service.go:183):
 *   - debt-change → payload.to_debt_group_code (GROUP_1..5)
 *   - rate-change → payload.new_rate
 *   - restructure → payload.new_term + payload.new_maturity_date
 *   - waiver      → amount_minor OR payload.waiver_percent
 *   - writeoff    → amount_minor AND payload.reason
 *   - recovery    → amount_minor AND top-level agreement_code
 *   - fund-check  → payload.result
 *   - revenue-allocation / vfu-fee-allocation → amount_minor
 *   - off-balance-export → payload.reason (amount optional)
 *   - mortgage-adjust → no payload validation
 */
export interface LoanAdjustment {
  id: string
  tenant_id: string
  kind: string
  contract_code: string
  agreement_code?: string
  effective_date?: string
  amount_minor?: number
  /** JSON object — per-kind payload keys (see validateKindPayload note). */
  payload?: Record<string, unknown>
  status: string
  workflow_case_id?: string
  decision_note?: string
  decided_by?: string
  created_by?: string
  created_at?: string
  updated_at?: string
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
  { key: "mortgage-adjust", labelKey: "loan.kind.mortgage_adjust" },
] as const

export type LoanAdjustmentKind = (typeof loanAdjustmentKinds)[number]["key"]

/**
 * Summary column spec per kind — `adjustmentFields(kind)` feeds the
 * adjustment list grid (tab 2) so each kind shows its own "main" column
 * (amount / percent / rate / reason / result...) instead of a generic one.
 * `labelKeys` are full i18n keys (loan.adjustment_screen.field.*), except
 * the `kind` entry which reuses `loan.kind.*`.
 */
export interface AdjustmentFieldSpec {
  /** Key in the top-level LoanAdjustment row, or prefixed "payload." for the jsonb. */
  field: string
  labelKey: string
  type: "money" | "percent" | "text"
  /** When the row has neither this field nor `orField`, the cell shows "—". */
  orField?: string
}

const ADJUSTMENT_LIST_FIELDS: Record<LoanAdjustmentKind, AdjustmentFieldSpec[]> = {
  "debt-change": [
    { field: "payload.to_debt_group_code", labelKey: "loan.adjustment_field.to_debt_group_code", type: "text" },
  ],
  "rate-change": [
    { field: "payload.new_rate", labelKey: "loan.adjustment_field.new_rate", type: "percent" },
  ],
  restructure: [
    { field: "payload.new_term", labelKey: "loan.adjustment_field.new_term", type: "text" },
    { field: "payload.new_maturity_date", labelKey: "loan.adjustment_field.new_maturity_date", type: "text" },
  ],
  waiver: [
    { field: "amount_minor", labelKey: "loan.field.amount", type: "money", orField: "payload.waiver_percent" },
  ],
  writeoff: [
    { field: "amount_minor", labelKey: "loan.field.amount", type: "money" },
    { field: "payload.reason", labelKey: "loan.adjustment_field.reason", type: "text" },
  ],
  recovery: [
    { field: "amount_minor", labelKey: "loan.field.amount", type: "money" },
    { field: "agreement_code", labelKey: "loan.field.agreement_code", type: "text" },
  ],
  "fund-check": [
    { field: "payload.result", labelKey: "loan.adjustment_field.result", type: "text" },
  ],
  "revenue-allocation": [
    { field: "amount_minor", labelKey: "loan.field.amount", type: "money" },
  ],
  "vfu-fee-allocation": [
    { field: "amount_minor", labelKey: "loan.field.amount", type: "money" },
  ],
  "off-balance-export": [
    { field: "payload.reason", labelKey: "loan.adjustment_field.reason", type: "text" },
  ],
  "mortgage-adjust": [
    { field: "decision_note", labelKey: "loan.field.note", type: "text" },
  ],
}

/** Kind → the "main" summary column(s) for the list grid (tab 2). */
export function adjustmentFields(kind: LoanAdjustmentKind): AdjustmentFieldSpec[] {
  return ADJUSTMENT_LIST_FIELDS[kind] ?? []
}

/** Reads a (possibly payload-nested) field path from an adjustment row. */
export function adjustmentFieldValue(
  item: LoanAdjustment,
  field: string
): string | number | undefined {
  if (field.startsWith("payload.")) {
    const key = field.slice("payload.".length)
    const value = item.payload?.[key]
    return typeof value === "number" || typeof value === "string" ? value : undefined
  }
  const value = (item as unknown as Record<string, unknown>)[field]
  return typeof value === "number" || typeof value === "string" ? value : undefined
}

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
  /**
   * Per-kind adjustment list. With `page` set the call runs server-paged
   * (BE listEnvelope paginates in memory over the LIMIT-500 slice); without
   * it the legacy fetch-all (`all=true`) applies for dropdown lookups.
   */
  listAdjustments: (
    kind: LoanAdjustmentKind,
    params: {
      contract_code?: string
      status?: string
      page?: number
      per_page?: number
    } = {}
  ) => {
    const search = listQuery({
      contract_code: params.contract_code,
      status: params.status,
      page: params.page,
      per_page: params.per_page,
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
  /** Agreements of one contract (plan_code + dư nợ + đang chờ) — contract
   * picker + batch grids đọc headroom từ đây. */
  listAgreements: (contractCode: string) =>
    getCanonicalList<LoanAgreement>(
      `/api/loan/agreements?contract_code=${encodeURIComponent(contractCode)}`
    ),
  /** Quy tắc định khoản khai báo sẵn theo document_type (preview bút toán). */
  postingRules: (documentType: LoanBatchDocumentType) =>
    getCanonicalList<LoanPostingRule>(
      `/api/loan/posting-rules?document_type=${encodeURIComponent(documentType)}`
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
  workflow_case_code?: string
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
  workflow_case_code?: string
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

// ── Agreements (hợp đồng giải ngân thuộc contract) ──

/**
 * Disbursement agreement — mirrors loan-service agreement rows. `plan_code`
 * groups contracts into posting plans (batch grids group rows by it);
 * `outstanding_amt_minor` (dư nợ đã giải ngân) + `pending_disburse_amt_minor`
 * (đang chờ duyệt) are the headroom inputs against `loan_amt_minor`.
 */
export interface LoanAgreement {
  agreement_code: string
  contract_code: string
  plan_code?: string
  currency_code: string
  outstanding_amt_minor: number
  pending_disburse_amt_minor: number
  disburse_amt_minor?: number
  status: string
}

// ── Posting rules (preview bút toán theo document_type) ──

export type LoanBatchDocumentType =
  | "LNM_DISB_REGISTER"
  | "LNM_DISB_COMPLETE"
  | "LNM_COLLECTION"

/** One resolved posting-rule line (STT / Nợ-Có / phân giải / tài khoản). */
export interface LoanPostingRule {
  line_no: number
  direction: "DEBIT" | "CREDIT"
  resolution_type: string
  account_ref: string
  acc_classification?: string
}

// ── Disbursement batches (iteration 13 — batch theo EPAS) ──

export type LoanBatchPaymentMethod = "CASH" | "TRANSFER"

/**
 * Trader (người giao dịch) — mirror của `ObjectInfoValue` (posting-flow) trên wire.
 */
export interface LoanBatchTrader {
  object_type: string
  object_code: string
  object_name: string
  id_number?: string
  issue_date?: string
  issue_place?: string
  address?: string
}

/** Response chung của create batch: case (workflow) + batch ledger id. */
export interface LoanBatchCreated {
  case_id: string
  case_code: string
  batch_id: string
}

export interface DisbursementBatchRegisterInput {
  org_code?: string
  txn_date: string
  payment_method: LoanBatchPaymentMethod
  account_code?: string
  description?: string
  trader?: LoanBatchTrader
  rows: {
    contract_code: string
    agreement_code: string
    amount_minor: number
  }[]
}

export interface DisbursementBatchCompleteInput {
  source_batch_id: string
  txn_date: string
  description?: string
  trader?: LoanBatchTrader
  /** amount_minor = 0 khi is_closed (đóng hợp đồng, không rút tiếp). */
  rows: {
    contract_code: string
    agreement_code: string
    amount_minor: number
    is_closed?: boolean
  }[]
}

export interface CollectionBatchCreateInput {
  txn_date: string
  description?: string
  trader?: LoanBatchTrader
  rows: {
    contract_code: string
    agreement_code: string
    principal_minor: number
    interest_minor: number
    overdue_interest_minor?: number
  }[]
}

/** Batch list item: header fields + friendly workflow_case_code. */
export interface LoanDisbursementBatch {
  id: string
  tenant_id?: string
  txn_date: string
  payment_method?: LoanBatchPaymentMethod
  account_code?: string
  description?: string
  flow_type?: LoanDisbursementFlowType
  source_batch_id?: string
  total_amt_minor?: number
  currency_code?: string
  status: string
  case_id?: string
  case_code?: string
  workflow_case_code?: string
  created_by?: string
  created_at?: string
  /** Chỉ có trên detail (GET /{id}). */
  rows?: LoanDisbursementBatchRow[]
}

export interface LoanDisbursementBatchRow {
  contract_code: string
  agreement_code: string
  amount_minor: number
  status?: string
  is_closed?: boolean
}

export interface LoanCollectionBatch {
  id: string
  tenant_id?: string
  txn_date: string
  description?: string
  total_amt_minor?: number
  currency_code?: string
  status: string
  case_id?: string
  case_code?: string
  workflow_case_code?: string
  created_by?: string
  created_at?: string
  rows?: LoanCollectionBatchRow[]
}

export interface LoanCollectionBatchRow {
  contract_code: string
  agreement_code: string
  principal_minor: number
  interest_minor: number
  overdue_interest_minor?: number
}

export const disbursementBatchApi = {
  createRegister: (body: DisbursementBatchRegisterInput) =>
    postCanonical<LoanBatchCreated>("/api/loan/disbursement-batches", body),
  createComplete: (body: DisbursementBatchCompleteInput) =>
    postCanonical<LoanBatchCreated>("/api/loan/disbursement-batches/complete", body),
  list: (
    params: {
      status?: string
      flow_type?: LoanDisbursementFlowType
      q?: string
      page?: number
      per_page?: number
    } = {}
  ) =>
    getCanonicalList<LoanDisbursementBatch>(
      `/api/loan/disbursement-batches?${buildSearchParams(params).toString()}`
    ),
  detail: (id: string) =>
    getCanonical<LoanDisbursementBatch>(
      `/api/loan/disbursement-batches/${encodeURIComponent(id)}`
    ),
}

export const collectionBatchApi = {
  create: (body: CollectionBatchCreateInput) =>
    postCanonical<LoanBatchCreated>("/api/loan/collection-batches", body),
  list: (
    params: {
      status?: string
      q?: string
      page?: number
      per_page?: number
    } = {}
  ) =>
    getCanonicalList<LoanCollectionBatch>(
      `/api/loan/collection-batches?${buildSearchParams(params).toString()}`
    ),
  detail: (id: string) =>
    getCanonical<LoanCollectionBatch>(
      `/api/loan/collection-batches/${encodeURIComponent(id)}`
    ),
}

// ── Formation (iteration 14 — LOAN_FORMATION_V2 stage screen) ───────────────

/** Candidate roles của lnm-loan-formation-v2 (zeebe candidateGroups). */
export type LoanFormationRole =
  | "LNM_MAKER"
  | "LNM_TWTD"
  | "LNM_POGD"
  | "LNM_GIDO"
  | "LNM_HODO"

/** User-task elementId của lnm-loan-formation-v2 (BPMN bpmn:userTask id). */
export type LoanFormationStepCode =
  | "UT_MakerInput"
  | "UT_TWRevalidate"
  | "UT_PGDReview"
  | "UT_GDReview"
  | "UT_BoardReview"

/**
 * Work item — mirrors workflow-service `repository.WorkItem` (fields the
 * formation screen consumes). `canClaim` is computed by the BE per caller.
 */
export interface FormationWorkItem {
  id: string
  caseId: string
  caseCode?: string
  caseType?: string
  title?: string
  status?: string
  stepCode?: string
  taskType?: string
  primaryObjectId?: string
  processInstanceKey?: string | number
  jobKey?: string | number
  candidateRole?: string
  assignedTo?: string
  assignedToName?: string
  canClaim?: boolean
}

/** Claim response — mirrors the CRM `WorkflowTask` shape (claim WorkflowTask). */
export interface FormationClaimedTask {
  jobKey: string | number
  type?: string
  elementId?: string
  processInstanceKey?: string | number
  caseId?: string
  candidateRole?: string
}

/** Body của PUT /api/loan/contracts/{id} — whitelist BE UpdateContract. */
export interface LoanContractUpdateInput {
  contract_no?: string
  loan_amt_minor: number
  interest_rate: number
  loan_term: number
  term_unit?: string
  contract_date?: string
  maturity_date?: string
  interest_schedule_day?: number
  interest_payment_freq?: string
  principal_payment_freq?: string
  purpose_code?: string
  employee_code?: string
  industry_code?: string
  loan_method_code?: string
}

/** Response của GET /api/workflow/cases/{id}/variables (caseVariables handler). */
export interface FormationCaseVariables {
  case_id: string
  process_instance_key: string
  variables: Record<string, unknown>
}

/**
 * Composite dossier — mirrors loan-service `repository.Dossier`; only the
 * sections the two FE screens read are typed, the rest stays opaque.
 */
export interface LoanDossier {
  contract: LoanContract
  agreements: LoanAgreement[]
  repay_plans: LoanRepayPlan[]
  disbursements: unknown[]
  collections: unknown[]
  mortgages: unknown[]
  collaterals: unknown[]
  workflow_case_ids: string[]
}

/**
 * One repay schedule row — mirrors loan-service `domain.RepayPlan` json tags
 * (internal/domain/loan.go:104-122). `to_date` is the payment due date; the
 * outstanding-after-period column is computed FE-side (previous balance −
 * plan principal) because BE stores the running `coln_*` paid amounts only.
 */
export interface LoanRepayPlan {
  id: string
  tenant_id: string
  contract_code: string
  agreement_code: string
  plan_no: number
  term_no: number
  from_date: string
  to_date: string
  interest_rate: number
  plan_principal_amt_minor: number
  plan_interest_amt_minor: number
  coln_principal_amt_minor: number
  coln_interest_amt_minor: number
  is_active: boolean
}

export const formationApi = {
  getWorkItem: (id: string) =>
    getCanonical<FormationWorkItem>(
      `/api/workflow/work-items/${encodeURIComponent(id)}`
    ),
  getCaseVariables: (caseId: string) =>
    getCanonical<FormationCaseVariables>(
      `/api/workflow/cases/${encodeURIComponent(caseId)}/variables`
    ),
  claimTask: (input: {
    role: string
    taskType?: string
    processInstanceKey?: string | number
    caseId?: string | null
    elementId?: string | null
  }) => postCanonical<FormationClaimedTask>("/api/workflow/tasks/claim", input),
  getTaskReadiness: (caseId: string, stepCode: string) =>
    getCanonical<{ ready: boolean; status: string }>(
      `/api/workflow/cases/${encodeURIComponent(caseId)}/task-readiness?stepCode=${encodeURIComponent(stepCode)}`
    ),
  completeTask: (input: {
    jobKey: string
    processInstanceKey: string
    elementId: string
    variables: Record<string, unknown>
  }) =>
    postCanonical<{ status: string }>(
      `/api/workflow/tasks/${encodeURIComponent(input.jobKey)}/complete`,
      {
        processInstanceKey: input.processInstanceKey,
        elementId: input.elementId,
        variables: input.variables,
      }
    ),
  getDossier: (contractId: string) =>
    getCanonical<LoanDossier>(
      `/api/loan/contracts/${encodeURIComponent(contractId)}/dossier`
    ),
  updateContract: (id: string, body: LoanContractUpdateInput) =>
    putCanonical<LoanContract>(
      `/api/loan/contracts/${encodeURIComponent(id)}`,
      body
    ),
}
