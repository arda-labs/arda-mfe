import type { LoanDossier } from "../../api"

// Status values from loan-service migrations. Only movements that actually
// moved money count (drafts, pending, rejected, cancelled, reversed do not).
const MONEY_MOVED = new Set(["POSTED", "DISBURSED", "CLOSED"])
const PAID = "PAID"
const CLOSED = "CLOSED"

export type DossierSummary = {
  limitMinor: number
  disbursedMinor: number
  disbursementCount: number
  principalCollectedMinor: number
  outstandingMinor: number
  totalTerms: number
  paidTerms: number
  overdueTerms: number
  nextDue: { termNo: number; date: string; amountMinor: number } | null
  closed: boolean
}

/**
 * Key figures and lifecycle facts of a credit contract, derived from the
 * dossier payload (no extra API). `today` is an ISO date (business date).
 */
export function summarizeDossier(
  dossier: LoanDossier,
  today: string
): DossierSummary {
  const disbursements = (dossier.disbursements ?? []).filter((item) =>
    MONEY_MOVED.has(item.status)
  )
  const collections = (dossier.collections ?? []).filter((item) =>
    MONEY_MOVED.has(item.status)
  )
  const plans = (dossier.repay_plans ?? [])
    .filter((plan) => plan.is_active)
    .sort((a, b) => a.term_no - b.term_no)

  const disbursedMinor = disbursements.reduce(
    (sum, item) => sum + item.disburse_amt_minor,
    0
  )
  const principalCollectedMinor = collections.reduce(
    (sum, item) => sum + item.principal_minor,
    0
  )
  const isPaid = (plan: (typeof plans)[number]) =>
    plan.payment_status === PAID
  const open = plans.filter((plan) => !isPaid(plan))
  const next = open.find((plan) => plan.to_date.slice(0, 10) >= today) ?? null

  return {
    limitMinor: dossier.contract.loan_amt_minor,
    disbursedMinor,
    disbursementCount: disbursements.length,
    principalCollectedMinor,
    outstandingMinor: Math.max(disbursedMinor - principalCollectedMinor, 0),
    totalTerms: plans.length,
    paidTerms: plans.length - open.length,
    overdueTerms: open.filter((plan) => plan.to_date.slice(0, 10) < today)
      .length,
    nextDue: next
      ? {
          termNo: next.term_no,
          date: next.to_date,
          amountMinor:
            next.plan_principal_amt_minor -
            next.coln_principal_amt_minor +
            (next.plan_interest_amt_minor - next.coln_interest_amt_minor),
        }
      : null,
    closed: dossier.contract.status === CLOSED,
  }
}

export type LifecycleState = "done" | "current" | "todo"

/** Ký HĐ → Giải ngân → Thu nợ → Tất toán states for LifecycleSteps. */
export function dossierLifecycle(summary: DossierSummary): {
  disbursement: LifecycleState
  repayment: LifecycleState
  settled: LifecycleState
} {
  if (summary.closed) {
    return { disbursement: "done", repayment: "done", settled: "done" }
  }
  const fullyDisbursed =
    summary.limitMinor > 0 && summary.disbursedMinor >= summary.limitMinor
  return {
    // Partly disbursed contracts are disbursing and repaying at once.
    disbursement: fullyDisbursed ? "done" : "current",
    repayment:
      summary.totalTerms > 0 && summary.paidTerms === summary.totalTerms
        ? "done"
        : summary.disbursedMinor > 0
          ? "current"
          : "todo",
    settled: "todo",
  }
}
