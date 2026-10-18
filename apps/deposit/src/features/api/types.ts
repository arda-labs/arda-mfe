// Deposit wire types. They are generated from
// arda-be/contracts/openapi/deposit-v1.json (ADR-005), which is itself derived
// from the deposit-service Go types, so a backend shape change shows up here as
// a type error instead of a runtime surprise. Do not redeclare wire fields in
// this file; map to view models in the feature that needs them.
import type {
  DepositAccrual,
  DepositDepositTxn,
  DepositIBMDetail,
  DepositIBMMovement,
  DepositIBMProduct,
  DepositInterbankDeposit,
  DepositInterbankStatementRow,
  DepositInterbankTxnRow,
  DepositInterestOp,
  DepositInterestRate,
  DepositProductRequest,
  DepositProductRequestInput,
  DepositRateRequest,
  DepositSavings,
  DepositSavingsDetail,
  DepositSavingsProduct,
  DepositSavingsStatementRow,
  DepositSavingsTxnRow,
  DepositSubmission,
  DepositBatchInterestResult,
} from "@workspace/api/generated/deposit-v1"

export type SavingsProduct = DepositSavingsProduct
export type Savings = DepositSavings
export type SavingsDetail = DepositSavingsDetail
export type DepositTxnLike = DepositDepositTxn
export type Accrual = DepositAccrual
export type InterestOp = DepositInterestOp
export type InterestRate = DepositInterestRate
export type RateRequest = DepositRateRequest
export type ProductRequest = DepositProductRequest
export type InterbankDeposit = DepositInterbankDeposit
export type IbmProduct = DepositIBMProduct
export type IbmMovement = DepositIBMMovement
export type IbmDetail = DepositIBMDetail
export type DepositStatementRow = DepositSavingsStatementRow
export type DepositTxnRow = DepositSavingsTxnRow
export type InterbankStatementRow = DepositInterbankStatementRow
export type InterbankTxnRow = DepositInterbankTxnRow
export type { DepositSubmission }
export type BatchInterestResult = DepositBatchInterestResult

/**
 * The rate change the client stages. The backend keeps it as raw JSON
 * (RateChangeRequest.payload / RateRequest.payload), so the generated wire type
 * is untyped; this is the shape this client writes and reads back.
 */
export interface RateChangePayload {
  product_code?: string
  term_months: number
  method?: string
  denominator?: number
  rate: number
  effective_from: string
}

/**
 * A request body built from a generated input schema. Request schemas leave
 * every field optional because the backend decodes leniently; K names the
 * fields this client always sends, and must be real backend fields.
 */
export type WireBody<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>

/**
 * Body of POST /api/deposit/product-requests without its request_type: the
 * product fields the maker stages. round_no and round_type go together or not
 * at all; omitted on an EDIT they leave the stored rounding unchanged.
 */
export type ProductUpsertRequest = WireBody<
  Omit<DepositProductRequestInput, "request_type">,
  "product_code" | "name" | "term_months" | "interest_rate"
>
