// Interbank BORROWING (tiền vay TCTD khác) wire types — the mirror of the
// placement side in ./types.ts. Split out so the shared types file stays under
// the api/types line budget (docs/conventions/feature-structure.md).

/** Lender class: Ngân hàng Hợp tác xã / NHNN / TCTD khác / Quỹ bảo toàn. */
export type IbmLenderType = "NHHTX" | "NHNN" | "OTHER_TCTD" | "SAFETY_FUND"

/** Funding purpose the PCF "Tiền vay TCTD" topic splits on. */
export type IbmFundingPurpose =
  | "CREDIT_EXPANSION"
  | "DEPOSIT_PAYMENT"
  | "DIFFICULTY"
  | "SPECIAL"
  | "OTHER"

/** Movement kinds on a borrow. */
export type IbmBorrowMovementKind = "DRAWDOWN" | "REPAYMENT" | "INTEREST" | "EARLY_REPAY"

export interface InterbankBorrow {
  id: string
  tenant_id: string
  borrow_code: string
  counterparty_code: string
  counterparty_name?: string
  product_code?: string
  lender_type: IbmLenderType
  funding_purpose: IbmFundingPurpose
  term_months: number
  drawdown_date: string
  maturity_date: string
  principal_minor: number
  outstanding_minor: number
  accrued_minor: number
  interest_rate: number
  currency_code: string
  org_code?: string
  status: string
  last_interest_date?: string
  workflow_case_id?: string
  journal_entry_id?: string
  created_by: string
  created_at?: string
  /** Row version the checker saw — sent back as `data_version` on decide. */
  data_version?: number
}

export interface IbmBorrowMovement {
  id: string
  borrow_id: string
  kind: IbmBorrowMovementKind
  amount_minor: number
  currency_code: string
  movement_date: string
  period_from?: string
  period_to?: string
  note?: string
  status: string
}

/** Borrow contract aggregate returned by the detail endpoint. */
export interface IbmBorrowDetail {
  borrow: InterbankBorrow
  movements: IbmBorrowMovement[]
}
