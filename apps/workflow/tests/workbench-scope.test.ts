import { describe, expect, test } from "bun:test"
import { workbenchScopeFromSearch } from "../src/features/workbench/burst-refetch"

describe("workbenchScopeFromSearch", () => {
  test("defaults incoming workbench to the candidate pool", () => {
    expect(workbenchScopeFromSearch("")).toBe("POOL")
  })

  test("reads the My work scope from the URL", () => {
    expect(workbenchScopeFromSearch("?scope=mine")).toBe("MINE")
  })
})
