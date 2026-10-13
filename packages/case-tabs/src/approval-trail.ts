import type { CaseTimelineEvent } from "./types"

export type TrailState = "done" | "current" | "todo" | "rejected" | "returned"

export type DerivedStep = {
  id: "maker" | "checker" | "final"
  state: TrailState
  actor?: string
  at?: string
  note?: string
}

const COMPLETED_STATUSES = new Set(["COMPLETED", "CLOSED", "POSTED", "DONE"])

/**
 * Maker → checker → final state of a business case, replayed from its
 * workflow timeline (case_timeline_events). A change request sends the case
 * back to the maker ("returned"); a resubmission starts the checker again.
 */
export function deriveApprovalTrail(events: CaseTimelineEvent[]): DerivedStep[] {
  const ordered = [...events].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id
  )
  const maker: DerivedStep = { id: "maker", state: "current" }
  const checker: DerivedStep = { id: "checker", state: "todo" }
  const final: DerivedStep = { id: "final", state: "todo" }
  const note = (event: CaseTimelineEvent) => event.note?.trim() || undefined

  for (const event of ordered) {
    switch (event.eventType) {
      case "CASE_CREATED":
        Object.assign(maker, { state: "current", actor: event.actor, at: event.createdAt })
        break
      case "CASE_SUBMITTED":
        Object.assign(maker, { state: "done", actor: event.actor, at: event.createdAt, note: undefined })
        Object.assign(checker, { state: "current", actor: undefined, at: event.createdAt, note: undefined })
        Object.assign(final, { state: "todo", actor: undefined, at: undefined, note: undefined })
        break
      case "CASE_CLAIMED":
        Object.assign(checker, { state: "current", actor: event.actor, at: event.createdAt })
        break
      case "CHECKER_REQUEST_CHANGES":
        Object.assign(maker, { state: "returned", actor: event.actor, at: event.createdAt, note: note(event) })
        Object.assign(checker, { state: "todo", actor: undefined, at: undefined, note: undefined })
        break
      case "CHECKER_APPROVED":
        Object.assign(checker, { state: "done", actor: event.actor, at: event.createdAt, note: note(event) })
        Object.assign(final, { state: "current", at: event.createdAt })
        break
      case "CHECKER_REJECTED":
        Object.assign(checker, { state: "rejected", actor: event.actor, at: event.createdAt, note: note(event) })
        Object.assign(final, { state: "todo", at: undefined })
        break
      case "TASK_COMPLETED":
        if (checker.state === "done") {
          Object.assign(final, { state: "done", actor: event.actor, at: event.createdAt })
        }
        break
      case "JOB_FAILED":
        if (checker.state === "done") {
          Object.assign(final, { state: "rejected", at: event.createdAt, note: note(event) })
        }
        break
      default:
        break
    }
    if (event.toStatus && COMPLETED_STATUSES.has(event.toStatus.toUpperCase()) && checker.state === "done") {
      Object.assign(final, { state: "done", at: event.createdAt })
    }
  }
  return [maker, checker, final]
}
