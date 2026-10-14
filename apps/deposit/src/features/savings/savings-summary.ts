import type { SavingsDetail } from "../api"
import { termProgress, type TermProgress } from "../../lib/term-progress"

// dpm_savings.status: ACTIVE|CLOSED (deposit-service init migration; settle
// closes the book). dpm_interest_ops.status: DRAFT → SUBMITTED → POSTING →
// POSTED, or REJECTED. Only POSTED operations moved money.
const ACTIVE = "ACTIVE"
const CLOSED = "CLOSED"
const POSTED = "POSTED"
const PENDING_OPS = new Set(["DRAFT", "SUBMITTED", "POSTING"])

export type SavingsSummary = {
  principalMinor: number
  accruedMinor: number
  currencyCode: string
  /** Annual rate (%) of the latest accrual, else of the latest interest op. */
  rate: number | null
  interestPaidMinor: number
  capitalizedMinor: number
  pendingInterestOps: number
  term: TermProgress
  active: boolean
  closed: boolean
}

/**
 * Key figures of a savings book, derived from the detail payload (no extra
 * API). The book carries no rate of its own: the rate is the one the latest
 * accrual (or interest operation) was computed with. `today` is ISO.
 */
export function summarizeSavings(
  detail: SavingsDetail,
  today: string
): SavingsSummary | null {
  const savings = detail.savings
  if (!savings) return null
  const accruals = [...(detail.accruals ?? [])].sort((a, b) =>
    `${b.period_to}|${b.created_at}`.localeCompare(`${a.period_to}|${a.created_at}`)
  )
  const ops = detail.interest_ops ?? []
  const latestOp = [...ops].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  const postedSum = (opType: string) =>
    ops
      .filter((op) => op.status === POSTED && op.op_type === opType)
      .reduce((sum, op) => sum + op.amount_minor, 0)

  return {
    principalMinor: savings.principal_minor,
    accruedMinor: savings.accrued_minor,
    currencyCode: savings.currency_code,
    rate: accruals[0]?.rate ?? latestOp?.rate ?? null,
    interestPaidMinor: postedSum("PAY"),
    capitalizedMinor: postedSum("CAPITALIZE"),
    pendingInterestOps: ops.filter((op) => PENDING_OPS.has(op.status)).length,
    term: termProgress(savings.open_date, savings.maturity_date, today),
    active: savings.status === ACTIVE,
    closed: savings.status === CLOSED,
  }
}

export type LifecycleState = "done" | "current" | "todo"

export type SavingsLifecycleStates = {
  opened: LifecycleState
  holding: LifecycleState
  settled: LifecycleState
}

/**
 * Mở sổ → Đang gửi → Tất toán. Null for a status deposit-service does not
 * emit, so the page shows no progress rather than a wrong one.
 */
export function savingsLifecycle(status: string): SavingsLifecycleStates | null {
  if (status === ACTIVE) return { opened: "done", holding: "current", settled: "todo" }
  if (status === CLOSED) return { opened: "done", holding: "done", settled: "done" }
  return null
}
