import { describe, expect, test } from "bun:test"
import type { CaseTimelineEvent } from "@workspace/case-tabs/types"
import { earlierChangeRequests } from "../src/features/workbench/utils/change-requests"

let seq = 0
const ev = (eventType: string, minute: number, note = ""): CaseTimelineEvent => ({
  id: ++seq,
  caseId: "c1",
  eventType,
  note,
  createdAt: `2026-10-13T08:${String(minute).padStart(2, "0")}:00Z`,
})

const notes = (events: CaseTimelineEvent[]) => events.map((event) => event.note)

describe("earlierChangeRequests", () => {
  const history = [
    ev("CASE_SUBMITTED", 0),
    ev("CHECKER_REQUEST_CHANGES", 1, "thiếu chứng từ"),
    ev("CASE_SUBMITTED", 2),
    ev("CHECKER_REQUEST_CHANGES", 3, "sai số tiền"),
    ev("CASE_SUBMITTED", 4),
  ]

  test("after a resubmission every request is earlier, newest first", () => {
    expect(notes(earlierChangeRequests(history, false))).toEqual(["sai số tiền", "thiếu chứng từ"])
  })

  test("drops the request the trail shows on a returned maker step", () => {
    expect(notes(earlierChangeRequests(history.slice(0, 4), true))).toEqual(["thiếu chứng từ"])
  })

  test("ignores other events and keeps the input order intact", () => {
    const events = [ev("CHECKER_APPROVED", 9, "ok"), ...history]
    const before = events.map((event) => event.id)
    expect(earlierChangeRequests(events, false)).toHaveLength(2)
    expect(events.map((event) => event.id)).toEqual(before)
  })
})
