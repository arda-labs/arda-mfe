import { describe, expect, test } from "bun:test"
import { cn } from "./utils"

describe("cn", () => {
  test("a caller height overrides the density-aware control height", () => {
    expect(cn("h-control w-full", "h-8")).toBe("w-full h-8")
    expect(cn("size-control", "size-8")).toBe("size-8")
    expect(cn("h-control-sm", "h-control-lg")).toBe("h-control-lg")
  })
})
