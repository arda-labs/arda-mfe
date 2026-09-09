import { parseMoneyInput, toMinor } from "@workspace/format"
import type { LoanAgreement, LoanContract } from "../api"

/**
 * Shared row math for the loan batch grids (register / complete / collection):
 * headroom + money-input parsing in minor units. Batch totals are ALWAYS
 * derived from the rows (EPAS list-edit-construct — tổng luôn suy ra từ dòng).
 */

/** Headroom = hạn mức hợp đồng − dư nợ đã giải ngân − đang chờ duyệt. */
export function headroomMinor(contract: LoanContract, agreement: LoanAgreement): number {
  return (
    contract.loan_amt_minor -
    agreement.outstanding_amt_minor -
    agreement.pending_disburse_amt_minor
  )
}

/** Major-unit money input → minor units (0 for empty/invalid input). */
export function inputToMinor(raw: string, currency = "VND"): number {
  const major = parseMoneyInput(raw)
  if (major === undefined) return 0
  return toMinor(major, currency)
}
