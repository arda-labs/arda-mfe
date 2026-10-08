import { describe, expect, it } from "bun:test"
import { validateRegister } from "../src/features/disbursements/batch-register/validation"
import { shouldPersistRegisterDraft, shouldWarnRegisterExit } from "../src/features/disbursements/batch-register/flow-state"

const contract = { loan_amt_minor: 100_000 } as never
const agreement = {
  outstanding_amt_minor: 20_000,
  pending_disburse_amt_minor: 10_000,
  currency_code: "VND",
} as never

describe("disbursement register validation", () => {
  it("reports client headroom overflow on the row input", () => {
    const issues = validateRegister({
      txnDate: "2026-10-08",
      paymentMethod: "TRANSFER",
      accountCode: "001",
      rows: [{ key: "row-1", contract, agreement, amount: "80000" }],
    })
    expect(issues).toEqual([
      {
        fieldId: "disburse-amount-row-1",
        messageKey: "loan.disbursements.batch.validation.headroom_exceeded",
        row: 1,
      },
    ])
  })

  it("builds a focusable error summary for missing header and rows", () => {
    const issues = validateRegister({
      txnDate: "invalid",
      paymentMethod: "TRANSFER",
      accountCode: " ",
      rows: [],
    })
    expect(issues.map((issue) => issue.fieldId)).toEqual([
      "disburse-date",
      "disburse-account",
      "disburse-rows",
    ])
  })
})

describe("disbursement draft flow state", () => {
  it("creates the initial draft and persists later edits before leaving a step", () => {
    expect(shouldPersistRegisterDraft(false, false)).toBe(true)
    expect(shouldPersistRegisterDraft(true, true)).toBe(true)
    expect(shouldPersistRegisterDraft(true, false)).toBe(false)
  })

  it("warns before leaving only while edits are unsaved", () => {
    expect(shouldWarnRegisterExit(true)).toBe(true)
    expect(shouldWarnRegisterExit(false)).toBe(false)
  })
})
