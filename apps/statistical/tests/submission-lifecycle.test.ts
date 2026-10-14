import { describe, expect, test } from "bun:test"
import { submissionLifecycle } from "../src/features/submissions/submission-lifecycle"

const states = (status: string) =>
  submissionLifecycle(status).map((step) => `${step.status}:${step.state}`)

describe("submissionLifecycle", () => {
  test("walks draft → submitted → approved", () => {
    expect(states("DRAFT")).toEqual(["DRAFT:current", "SUBMITTED:todo", "APPROVED:todo"])
    expect(states("SUBMITTED")).toEqual(["DRAFT:done", "SUBMITTED:current", "APPROVED:todo"])
    expect(states("APPROVED")).toEqual(["DRAFT:done", "SUBMITTED:done", "APPROVED:done"])
  })

  test("shows a rejection as the decision step it stopped at", () => {
    expect(states("REJECTED")).toEqual(["DRAFT:done", "SUBMITTED:done", "REJECTED:current"])
  })

  test("leaves an unknown status untouched", () => {
    expect(states("ARCHIVED")).toEqual(["DRAFT:todo", "SUBMITTED:todo", "APPROVED:todo"])
  })
})
