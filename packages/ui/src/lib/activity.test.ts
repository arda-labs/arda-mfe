import { describe, expect, test } from "bun:test"
import { groupByDay, initials } from "../components/activity-log"

describe("initials", () => {
  test("first and last word of a Vietnamese name", () => {
    expect(initials("Trần Thị Hà")).toBe("TH")
    expect(initials("system")).toBe("S")
    expect(initials("  ")).toBe("·")
    expect(initials(undefined)).toBe("·")
  })
})

describe("groupByDay", () => {
  test("groups by the Ho Chi Minh day, newest first", () => {
    const groups = groupByDay([
      { at: "2026-10-12T09:00:00Z" },
      // 18:30Z is already 13/10 in Ho Chi Minh (UTC+7)
      { at: "2026-10-12T18:30:00Z" },
      { at: "2026-10-13T02:00:00Z" },
    ])
    expect(groups.map((g) => [g.day, g.items.length])).toEqual([
      ["2026-10-13", 2],
      ["2026-10-12", 1],
    ])
    expect(groups[0]?.items[0]?.at).toBe("2026-10-13T02:00:00Z")
  })
})
