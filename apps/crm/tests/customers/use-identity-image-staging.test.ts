import { describe, expect, test } from "bun:test"
import { createIdentityImageStaging } from "../../src/features/customers/utils/use-identity-image-staging"

describe("identity image staging", () => {
  test("attaches immediately when a case exists", async () => {
    const calls: [string[], string][] = []
    const s = createIdentityImageStaging(async (ids, caseId) => void calls.push([ids, caseId]), () => "case-1")
    expect(await s.stage(["a", "b"])).toBe("attached")
    expect(calls).toEqual([[["a", "b"], "case-1"]])
    expect(await s.flush("case-1")).toBe(0)
  })

  test("holds ids until the case is created, then attaches once", async () => {
    const calls: [string[], string][] = []
    const s = createIdentityImageStaging(async (ids, caseId) => void calls.push([ids, caseId]), () => null)
    expect(await s.stage(["a"])).toBe("staged")
    expect(await s.stage(["b"])).toBe("staged")
    expect(await s.flush(undefined)).toBe(0)
    expect(await s.flush("case-9")).toBe(2)
    expect(await s.flush("case-9")).toBe(0)
    expect(calls).toEqual([[["a", "b"], "case-9"]])
  })

  test("a stage after flush attaches immediately to the flushed case", async () => {
    const calls: [string[], string][] = []
    const s = createIdentityImageStaging(async (ids, caseId) => void calls.push([ids, caseId]), () => null)
    expect(await s.flush("case-9")).toBe(0)
    expect(await s.stage(["x"])).toBe("attached")
    expect(calls).toEqual([[["x"], "case-9"]])
  })

  test("reads the case id at stage time", async () => {
    const calls: [string[], string][] = []
    let current: string | null = null
    const s = createIdentityImageStaging(async (ids, caseId) => void calls.push([ids, caseId]), () => current)
    expect(await s.stage(["a"])).toBe("staged")
    current = "case-2"
    expect(await s.stage(["b"])).toBe("attached")
    expect(calls).toEqual([[["b"], "case-2"]])
  })
})
