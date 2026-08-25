import { describe, expect, test } from "bun:test"
import { waitForWorkflowStepChange } from "../src/features/customers/utils/workflow-transition"

describe("waitForWorkflowStepChange", () => {
  test("waits until the case leaves the completed maker step", async () => {
    const steps = ["UT_MakerRevise", "UT_MakerRevise", "UT_CheckerReview"]
    let index = 0

    const result = await waitForWorkflowStepChange({
      caseId: "case-1",
      completedElementId: "UT_MakerRevise",
      loadCase: async () => ({
        currentStep: steps[index++] ?? "UT_CheckerReview",
      }),
      wait: async () => {},
      timeoutMs: 1_000,
    })

    expect(result).toEqual({ step: "UT_CheckerReview", timedOut: false })
    expect(index).toBe(3)
  })

  test("returns timedOut=true when the transition does not appear before timeout", async () => {
    let now = 0

    const result = await waitForWorkflowStepChange({
      caseId: "case-1",
      completedElementId: "Activity_MakerRevise",
      loadCase: async () => ({ currentStep: "UT_MakerRevise" }),
      wait: async () => {
        now += 500
      },
      now: () => now,
      timeoutMs: 1_000,
      intervalMs: 500,
    })

    expect(result).toEqual({ step: null, timedOut: true })
  })

  test("retries a transient case read failure", async () => {
    let attempts = 0

    const result = await waitForWorkflowStepChange({
      caseId: "case-1",
      completedElementId: "UT_MakerRevise",
      loadCase: async () => {
        attempts += 1
        if (attempts === 1) throw new Error("temporary gateway error")
        return { currentStep: "UT_CheckerReview" }
      },
      wait: async () => {},
      timeoutMs: 1_000,
    })

    expect(result).toEqual({ step: "UT_CheckerReview", timedOut: false })
    expect(attempts).toBe(2)
  })
})
