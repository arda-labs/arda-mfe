export interface SavingsProduct {
  id: string
  tenant_id: string
  code: string
  name: string
  term_months: number
  interest_rate: number
  currency_code: string
  is_active: boolean
  created_at?: string
}

// ── Savings account ──

export interface Savings {
  id: string
  tenant_id: string
  savings_code: string
  customer_code: string
  product_code: string
  open_date: string
  maturity_date: string
  principal_minor: number
  accrued_minor: number
  currency_code: string
  org_code?: string
  status: string
  workflow_case_id?: string
  journal_entry_id?: string
  created_by: string
  created_at?: string
  /** Row version the checker saw — sent back as `dataVersion` on approve. */
  data_version?: number
}

/** Staged rate register/adjust request (DPM.100/101 checker dossier). */
export interface RateRequest {
  id: string
  request_type: "REGISTER" | "EDIT" | "ADJUST"
  payload: {
    product_code?: string
    term_months?: number
    method?: string
    denominator?: number
    rate?: number
    effective_from?: string
  }
  status: "SUBMITTED" | "APPLIED" | "REJECTED"
  workflow_case_id?: string
  created_by?: string
  created_at?: string
  updated_at?: string
  /** Row version the checker saw — sent back as `dataVersion` on approve. */
  data_version?: number
}

// ── Interbank deposit ──

export interface InterbankDeposit {
  id: string
  tenant_id: string
  deposit_code: string
  product_code?: string
  counterparty_code: string
  counterparty_name?: string
  deposit_date: string
  maturity_date: string
  principal_minor: number
  interest_rate: number
  accrued_minor: number
  last_interest_date?: string
  currency_code: string
  org_code?: string
  status: string
  workflow_case_id?: string
  journal_entry_id?: string
  created_by: string
  created_at?: string
  /** Row version the checker saw — sent back as `dataVersion` on approve. */
  data_version?: number
}

/** IBM product catalog row (sản phẩm tiền gửi liên ngân hàng). */
export interface IbmProduct {
  id: string
  tenant_id: string
  code: string
  name: string
  term_months: number
  interest_rate: number
  currency_code: string
  is_active: boolean
}

/** Staged IBM movement (TOP_UP / INTEREST / EXPECTED / WITHDRAW). */
export interface IbmMovement {
  id: string
  deposit_id: string
  kind: string
  amount_minor: number
  currency_code: string
  movement_date: string
  period_from?: string
  period_to?: string
  note?: string
  status: string
  workflow_case_id?: string
  journal_entry_id?: string
  created_at?: string
}

/** IBM contract aggregate returned by the detail endpoint. */
export interface IbmDetail {
  deposit: InterbankDeposit
  movements: IbmMovement[]
}

/** DPM rate tier (DPM.100/101). */
export interface InterestRate {
  id: string
  product_code?: string
  term_months: number
  method: string
  denominator: number
  rate: number
  effective_from: string
  is_active: boolean
  created_at?: string
}

/** One accrual row (DPM.305). */
export interface Accrual {
  id: string
  savings_code: string
  period_from: string
  period_to: string
  days: number
  base_minor: number
  rate: number
  amount_minor: number
  status: string
  created_at?: string
}

/** One interest pay/capitalize op (DPM.302/303/304). */
export interface InterestOp {
  id: string
  savings_code: string
  op_type: string
  amount_minor: number
  status: string
  workflow_case_id?: string
  journal_entry_id?: string
  created_at?: string
}

/** Savings aggregate returned by the detail endpoint. */
export interface SavingsDetail {
  savings: Savings
  transactions: DepositTxnLike[]
  accruals: Accrual[]
  interest_ops: InterestOp[]
}

/** Minimal transaction shape reused by the savings detail. */
export interface DepositTxnLike {
  id: string
  txn_type: string
  amount_minor: number
  currency_code: string
  txn_date: string
  status: string
  journal_entry_id?: string
  created_at?: string
}

/** Report row shapes (W4c, data owner computes). */
export interface DepositStatementRow {
  savings_code: string
  customer_code: string
  product_code: string
  open_date: string
  maturity_date: string
  principal_minor: number
  accrued_minor: number
  currency_code: string
  status: string
}

export interface DepositTxnRow {
  txn_date: string
  savings_code: string
  txn_type: string
  amount_minor: number
  currency_code: string
  status: string
  journal_entry_id?: string
}

export interface InterbankStatementRow {
  deposit_code: string
  counterparty_code: string
  counterparty_name?: string
  product_code?: string
  deposit_date: string
  maturity_date: string
  principal_minor: number
  accrued_minor: number
  currency_code: string
  status: string
}

export interface InterbankTxnRow {
  movement_date: string
  deposit_code: string
  kind: string
  amount_minor: number
  currency_code: string
  note?: string
  status: string
}

/** Workflow submission handle returned by settle/deposit endpoints. */
export interface DepositSubmission {
  case_id: string
  case_code: string
}

/** DPM.102/103 staged product register/edit request. */
export interface ProductRequest {
  id: string
  request_type: "REGISTER" | "EDIT"
  product_code: string
  name: string
  term_months: number
  interest_rate: number
  currency_code: string
  status: "SUBMITTED" | "APPLIED" | "REJECTED"
  workflow_case_code?: string
  created_by?: string
  created_at?: string
  /** Row version the checker saw — sent back as `dataVersion` on approve. */
  data_version?: number
}
