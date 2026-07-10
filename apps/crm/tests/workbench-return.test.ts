import { describe, expect, test } from "bun:test"
import { postTaskWorkbenchHref } from "../src/features/customers/shared/workbench-return"

describe("postTaskWorkbenchHref", () => {
  test("returns to the unfiltered incoming inbox after a task completes", () => {
    expect(postTaskWorkbenchHref()).toBe("/workbench/incoming-transactions")
  })
})
