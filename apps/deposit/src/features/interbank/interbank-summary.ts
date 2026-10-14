import type { IbmDetail } from "../api"
import { termProgress, type TermProgress } from "../../lib/term-progress"

// ibm_deposits.status: a placement is created PENDING_APPROVAL and the
// checker moves it to ACTIVE or REJECTED (deposit-service ibm_service.go).
// ibm_movements.status: DRAFT → SUBMITTED → POSTED, or REJECTED.
const PENDING_APPROVAL = "PENDING_APPROVAL"
const ACTIVE = "ACTIVE"
const POSTED = "POSTED"
const PENDING_MOVEMENTS = new Set(["DRAFT", "SUBMITTED"])

export type InterbankSummary = {
  principalMinor: number
  accruedMinor: number
  currencyCode: string
  rate: number
  toppedUpMinor: number
  interestCollectedMinor: number
  withdrawnMinor: number
  pendingMovements: number
  term: TermProgress
  active: boolean
}

/**
 * Key figures of an interbank placement, derived from the detail payload (no
 * extra API). Posted TOP_UP / WITHDRAW movements are already reflected in the
 * principal; their sums are shown as context. `today` is ISO.
 */
export function summarizeInterbank(
  detail: IbmDetail,
  today: string
): InterbankSummary | null {
  const deposit = detail.deposit
  if (!deposit) return null
  const movements = detail.movements ?? []
  const postedSum = (kind: string) =>
    movements
      .filter((row) => row.status === POSTED && row.kind === kind)
      .reduce((sum, row) => sum + row.amount_minor, 0)

  return {
    principalMinor: deposit.principal_minor,
    accruedMinor: deposit.accrued_minor,
    currencyCode: deposit.currency_code,
    rate: deposit.interest_rate,
    toppedUpMinor: postedSum("TOP_UP"),
    interestCollectedMinor: postedSum("INTEREST"),
    withdrawnMinor: postedSum("WITHDRAW"),
    pendingMovements: movements.filter((row) => PENDING_MOVEMENTS.has(row.status)).length,
    term: termProgress(deposit.deposit_date, deposit.maturity_date, today),
    active: deposit.status === ACTIVE,
  }
}

export type LifecycleState = "done" | "current" | "todo"

export type InterbankLifecycleStates = {
  submitted: LifecycleState
  approved: LifecycleState
  effective: LifecycleState
}

/**
 * Trình duyệt → Phê duyệt → Hiệu lực. Null for REJECTED (the status badge
 * says it) and for any status deposit-service does not emit.
 */
export function interbankLifecycle(status: string): InterbankLifecycleStates | null {
  if (status === PENDING_APPROVAL) {
    return { submitted: "done", approved: "current", effective: "todo" }
  }
  if (status === ACTIVE) {
    return { submitted: "done", approved: "done", effective: "current" }
  }
  return null
}
