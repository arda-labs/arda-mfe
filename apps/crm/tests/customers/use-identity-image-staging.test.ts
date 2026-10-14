import { describe, expect, test } from "bun:test"
import { createIdentityImageStaging } from "../../src/features/customers/utils/use-identity-image-staging"

describe("identity image staging", () => {
  test("attaches immediately when a case exists", async () => {
    const calls: [string[], string][] = []
    const s = createIdentityImageStaging(async (ids, caseId) => void calls.push([ids, caseId]))
    expect(await s.stage(["a", "b"], "case-1")).toBe("attached")
    expect(calls).toEqual([[["a", "b"], "case-1"]])
    expect(await s.flush("case-1")).toBe(0)
  })

  test("holds ids until the case is created, then attaches once", async () => {
    const calls: [string[], string][] = []
    const s = createIdentityImageStaging(async (ids, caseId) => void calls.push([ids, caseId]))
    expect(await s.stage(["a"], null)).toBe("staged")
    expect(await s.stage(["b"], null)).toBe("staged")
    expect(await s.flush(undefined)).toBe(0)
    expect(await s.flush("case-9")).toBe(2)
    expect(await s.flush("case-9")).toBe(0)
    expect(calls).toEqual([[["a", "b"], "case-9"]])
  })
})
