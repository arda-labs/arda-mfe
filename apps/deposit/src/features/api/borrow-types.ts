// Interbank BORROWING (tiền vay TCTD khác) types. Wire shapes are generated
// from arda-be/contracts/openapi/deposit-v1.json (ADR-005); the literal unions
// below are the values the forms offer, not a promise about every value the
// backend may return.
import type {
  DepositBorrowDetail,
  DepositIBMBorrowMovement,
  DepositInterbankBorrow,
} from "@workspace/api/generated/deposit-v1"

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

export type InterbankBorrow = DepositInterbankBorrow
export type IbmBorrowMovement = DepositIBMBorrowMovement
/** Borrow contract aggregate returned by the detail endpoint. */
export type IbmBorrowDetail = DepositBorrowDetail
