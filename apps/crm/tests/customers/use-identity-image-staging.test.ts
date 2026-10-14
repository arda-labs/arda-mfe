import { describe, expect, test } from "bun:test"
import {
  createIdentityImageStaging,
  createStagingScopes,
  shouldResetStaging,
} from "../../src/features/customers/utils/use-identity-image-staging"

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
    expect(await s.stage(["a", "b"])).toBe("staged")
    expect(await s.flush(undefined)).toBe(0)
    expect(await s.flush("case-9")).toBe(2)
    expect(await s.flush("case-9")).toBe(0)
    expect(calls).toEqual([[["a", "b"], "case-9"]])
  })

  test("a re-scan before a case exists replaces the previous photos", async () => {
    const calls: [string[], string][] = []
    const s = createIdentityImageStaging(async (ids, caseId) => void calls.push([ids, caseId]), () => null)
    await s.stage(["p"])
    await s.stage(["q"])
    expect(await s.flush("c")).toBe(1)
    expect(calls).toEqual([[["q"], "c"]])
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

  test("a fresh instance for another customer never attaches to a previous case", async () => {
    const calls: [string[], string][] = []
    const attach = async (ids: string[], caseId: string) => void calls.push([ids, caseId])
    const a = createIdentityImageStaging(attach, () => null)
    await a.stage(["a1"])
    expect(await a.flush("case-A")).toBe(1)
    const b = createIdentityImageStaging(attach, () => null)
    expect(await b.stage(["b1"])).toBe("staged")
    expect(await b.flush(undefined)).toBe(0)
    expect(calls).toEqual([[["a1"], "case-A"]])
  })

  test("shouldResetStaging is claim-based", () => {
    expect(shouldResetStaging("", "", null)).toBe(false)
    expect(shouldResetStaging("", "B", null)).toBe(true)
    expect(shouldResetStaging("", "B", "B")).toBe(false)
    expect(shouldResetStaging("", "B", "A")).toBe(true)
    expect(shouldResetStaging("A", "A", null)).toBe(false)
    expect(shouldResetStaging("A", "B", null)).toBe(true)
    expect(shouldResetStaging("A", "", "A")).toBe(true)
  })
})

describe("staging scopes", () => {
  const setup = (live: () => string | null = () => null) => {
    const calls: [string[], string][] = []
    const scopes = createStagingScopes(async (ids, caseId) => void calls.push([ids, caseId]), live)
    return { calls, scopes }
  }

  test("an unsaved scan is not flushed onto a customer loaded afterwards", async () => {
    const { calls, scopes } = setup()
    await scopes.current("").stage(["x"])
    scopes.current("") // sidebar "New registration"
    const b = scopes.current("B") // browser Back to ?customerId=B, never claimed
    expect(await b.flush("case-B")).toBe(0)
    expect(calls).toEqual([])
  })

  test("the first save of the current form keeps its staged photos", async () => {
    const { calls, scopes } = setup()
    await scopes.current("").stage(["x"])
    scopes.claim("A")
    const a = scopes.current("A")
    expect(await a.flush("case-A")).toBe(1)
    expect(calls).toEqual([[["x"], "case-A"]])
  })

  test("an old scope never reads the live case of the new customer", async () => {
    const { calls, scopes } = setup(() => "case-B")
    const old = scopes.current("")
    scopes.current("B")
    expect(await old.stage(["x"])).toBe("staged")
    expect(calls).toEqual([])
  })

  test("the current scope reads the live case", async () => {
    const { calls, scopes } = setup(() => "case-B")
    expect(await scopes.current("B").stage(["x"])).toBe("attached")
    expect(calls).toEqual([[["x"], "case-B"]])
  })
})
