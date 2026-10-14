import type { ContractDetail } from "../api"

// Values from capital-service (cfc_contracts / cfc_movements). A contract is
// created PENDING_APPROVAL, the checker moves it to ACTIVE or REJECTED, and a
// POSTED SETTLEMENT movement closes it (CLOSED).
const PENDING_APPROVAL = "PENDING_APPROVAL"
const ACTIVE = "ACTIVE"
const CLOSED = "CLOSED"
const REJECTED = "REJECTED"
// Movements only move money once approved and posted; SUBMITTED ones wait on
// the checker. Outflows mirror the BE availability guard
// (PostedMovementTotals): receipts in, disbursement/payment/settlement out.
const POSTED = "POSTED"
const SUBMITTED = "SUBMITTED"
const RECEIPT = "RECEIPT"
const OUTFLOWS = new Set(["DISBURSEMENT", "PAYMENT", "SETTLEMENT"])
const SETTLEMENT = "SETTLEMENT"

export type ContractSummary = {
  amountMinor: number
  receivedMinor: number
  outflowMinor: number
  /** Posted receipts minus posted outflows (what the BE lets you spend). */
  availableMinor: number
  postedCount: number
  pendingCount: number
  /** Whole days from `today` to maturity; negative once past due. */
  daysToMaturity: number | null
  /** Date of the posted settlement that closed the contract. */
  settledOn: string | null
}

function isoDay(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/** Days from `from` to `to` (both ISO dates); null when either is missing. */
export function daysBetween(from: string, to?: string): number | null {
  if (!to) return null
  const start = isoDay(from)
  const end = isoDay(to)
  if (start === null || end === null) return null
  return Math.round((end - start) / 86_400_000)
}

/**
 * Key figures of a fund contract, derived from the contract detail payload
 * (no extra API). `today` is an ISO date (business date).
 */
export function summarizeContract(
  detail: ContractDetail,
  today: string
): ContractSummary {
  const movements = detail.movements ?? []
  const posted = movements.filter((item) => item.status === POSTED)
  const sum = (predicate: (type: string) => boolean) =>
    posted
      .filter((item) => predicate(item.movement_type))
      .reduce((total, item) => total + item.amount_minor, 0)
  const receivedMinor = sum((type) => type === RECEIPT)
  const outflowMinor = sum((type) => OUTFLOWS.has(type))
  const settlement = posted
    .filter((item) => item.movement_type === SETTLEMENT)
    .sort((a, b) => b.movement_date.localeCompare(a.movement_date))[0]

  return {
    amountMinor: detail.contract.amount_minor,
    receivedMinor,
    outflowMinor,
    availableMinor: receivedMinor - outflowMinor,
    postedCount: posted.length,
    pendingCount: movements.filter((item) => item.status === SUBMITTED).length,
    daysToMaturity: daysBetween(today, detail.contract.maturity_date),
    settledOn: settlement ? settlement.movement_date : null,
  }
}

export type LifecycleState = "done" | "current" | "todo"

export type ContractLifecycle = {
  approval: LifecycleState
  active: LifecycleState
  settled: LifecycleState
  rejected: boolean
}

/** Lập HĐ → Phê duyệt → Hiệu lực → Tất toán states for LifecycleSteps. */
export function contractLifecycle(status: string): ContractLifecycle {
  switch (status) {
    case PENDING_APPROVAL:
      return { approval: "current", active: "todo", settled: "todo", rejected: false }
    case REJECTED:
      return { approval: "current", active: "todo", settled: "todo", rejected: true }
    case ACTIVE:
      return { approval: "done", active: "current", settled: "todo", rejected: false }
    case CLOSED:
      return { approval: "done", active: "done", settled: "done", rejected: false }
    default:
      return { approval: "todo", active: "todo", settled: "todo", rejected: false }
  }
}

export type MaturityTone = "default" | "warning" | "danger"

/** Past-due active contracts are danger; within `warnDays` a warning. */
export function maturityTone(
  status: string,
  daysToMaturity: number | null,
  warnDays = 30
): MaturityTone {
  if (status !== ACTIVE || daysToMaturity === null) return "default"
  if (daysToMaturity < 0) return "danger"
  return daysToMaturity <= warnDays ? "warning" : "default"
}
