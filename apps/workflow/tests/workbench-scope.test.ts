import { describe, expect, test } from "bun:test"
import {
  workItemInteraction,
  workItemRowClassName,
} from "../src/features/workbench/work-item-state"

describe("workItemInteraction", () => {
  test("keeps routing rows visible but non-interactive", () => {
    expect(
      workItemInteraction(
        { status: "ROUTING", canClaim: false, canOpen: false },
        false
      )
    ).toEqual({ canAct: false, isRouting: true })
    expect(workItemRowClassName({ status: "ROUTING" })).toBe(
      "workflow-routing-row"
    )
  })

  test("allows only ready or claimed rows with an API permission to open", () => {
    expect(
      workItemInteraction(
        { status: "READY", canClaim: true, canOpen: false },
        false
      )
    ).toEqual({ canAct: true, isRouting: false })
    expect(workItemRowClassName({ status: "READY" })).toBeUndefined()
  })
})
