import { isValidISODate } from "@workspace/format"
import { headroomMinor, inputToMinor } from "../../loan-batches/row-math"
import type { LoanAgreement, LoanContract } from "../../api"

export interface RegisterValidationRow {
  key: string
  contract: LoanContract
  agreement: LoanAgreement
  amount: string
}

export interface RegisterValidationIssue {
  fieldId: string
  messageKey:
    | "loan.batch.validation.date_required"
    | "loan.disbursements.batch.validation.account_required"
    | "loan.disbursements.batch.validation.rows_required"
    | "loan.disbursements.batch.validation.amount_positive"
    | "loan.disbursements.batch.validation.headroom_exceeded"
  row?: number
}

export function validateRegister(input: {
  txnDate: string
  paymentMethod: "TRANSFER" | "CASH"
  accountCode: string
  rows: RegisterValidationRow[]
}): RegisterValidationIssue[] {
  const issues: RegisterValidationIssue[] = []
  if (!isValidISODate(input.txnDate)) {
    issues.push({ fieldId: "disburse-date", messageKey: "loan.batch.validation.date_required" })
  }
  if (input.paymentMethod === "TRANSFER" && !input.accountCode.trim()) {
    issues.push({ fieldId: "disburse-account", messageKey: "loan.disbursements.batch.validation.account_required" })
  }
  if (input.rows.length === 0) {
    issues.push({ fieldId: "disburse-rows", messageKey: "loan.disbursements.batch.validation.rows_required" })
  }
  input.rows.forEach((row, index) => {
    const amount = inputToMinor(row.amount, row.agreement.currency_code)
    if (amount <= 0) {
      issues.push({
        fieldId: `disburse-amount-${row.key}`,
        messageKey: "loan.disbursements.batch.validation.amount_positive",
        row: index + 1,
      })
    } else if (amount > headroomMinor(row.contract, row.agreement)) {
      issues.push({
        fieldId: `disburse-amount-${row.key}`,
        messageKey: "loan.disbursements.batch.validation.headroom_exceeded",
        row: index + 1,
      })
    }
  })
  return issues
}
