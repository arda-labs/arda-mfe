import { describe, expect, test } from "bun:test"
import { deriveApprovalTrail } from "./approval-trail"
import type { CaseTimelineEvent } from "./types"

let seq = 0
const ev = (eventType: string, minute: number, extra: Partial<CaseTimelineEvent> = {}): CaseTimelineEvent => ({
  id: ++seq,
  caseId: "c1",
  eventType,
  note: "",
  createdAt: `2026-10-13T08:${String(minute).padStart(2, "0")}:00Z`,
  ...extra,
})

const states = (events: CaseTimelineEvent[]) => deriveApprovalTrail(events).map((step) => step.state)

describe("deriveApprovalTrail", () => {
  test("a fresh case waits on the maker", () => {
    expect(states([ev("CASE_CREATED", 0, { actor: "ha.tt" })])).toEqual(["current", "todo", "todo"])
  })

  test("submitted and claimed: checker holds it", () => {
    const trail = deriveApprovalTrail([
      ev("CASE_CREATED", 0, { actor: "ha.tt" }),
      ev("CASE_SUBMITTED", 1, { actor: "ha.tt" }),
      ev("CASE_CLAIMED", 2, { actor: "an.nv" }),
    ])
    expect(trail.map((s) => s.state)).toEqual(["done", "current", "todo"])
    expect(trail[1]?.actor).toBe("an.nv")
  })

  test("a change request goes back to the maker with the reason", () => {
    const trail = deriveApprovalTrail([
      ev("CASE_SUBMITTED", 1, { actor: "ha.tt" }),
      ev("CHECKER_REQUEST_CHANGES", 3, { actor: "an.nv", note: "Thiếu chứng từ" }),
    ])
    expect(trail.map((s) => s.state)).toEqual(["returned", "todo", "todo"])
    expect(trail[0]?.note).toBe("Thiếu chứng từ")
  })

  test("resubmission after changes restarts the review", () => {
    expect(
      states([
        ev("CASE_SUBMITTED", 1),
        ev("CHECKER_REQUEST_CHANGES", 3),
        ev("CASE_SUBMITTED", 5),
      ])
    ).toEqual(["done", "current", "todo"])
  })

  test("approved then completed; rejected stops the trail", () => {
    expect(
      states([ev("CASE_SUBMITTED", 1), ev("CHECKER_APPROVED", 2), ev("TASK_COMPLETED", 3)])
    ).toEqual(["done", "done", "done"])
    expect(states([ev("CASE_SUBMITTED", 1), ev("CHECKER_APPROVED", 2)])).toEqual([
      "done",
      "done",
      "current",
    ])
    expect(states([ev("CASE_SUBMITTED", 1), ev("CHECKER_REJECTED", 2, { note: "Sai TK" })])).toEqual([
      "done",
      "rejected",
      "todo",
    ])
  })

  test("a failed posting job after approval marks the final step", () => {
    expect(
      states([ev("CASE_SUBMITTED", 1), ev("CHECKER_APPROVED", 2), ev("JOB_FAILED", 3)])
    ).toEqual(["done", "done", "rejected"])
  })
})
