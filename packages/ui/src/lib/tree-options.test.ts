import { describe, expect, test } from "bun:test"
import { toTreeOptions } from "./tree-options"

describe("toTreeOptions", () => {
  test("orders depth-first with indent depth", () => {
    const options = toTreeOptions([
      { id: "kt", parent_id: "hs", code: "HS-KT", name: "Phòng Kế toán" },
      { id: "hs", code: "HS", name: "Hội sở" },
      { id: "td", parent_id: "hs", code: "HS-TD", name: "Phòng Tín dụng" },
      { id: "cn1", code: "CN1", name: "Chi nhánh 1" },
      { id: "cn1-td", parent_id: "cn1", code: "CN1-TD", name: "Tổ tín dụng" },
    ])
    expect(options.map((o) => [o.code, o.depth])).toEqual([
      ["CN1", 0],
      ["CN1-TD", 1],
      ["HS", 0],
      ["HS-KT", 1],
      ["HS-TD", 1],
    ])
  })

  test("orphans become roots and cycles do not loop", () => {
    const options = toTreeOptions([
      { id: "a", parent_id: "missing", code: "A", name: "A" },
      { id: "b", parent_id: "c", code: "B", name: "B" },
      { id: "c", parent_id: "b", code: "C", name: "C" },
    ])
    expect(options.map((o) => o.value).sort()).toEqual(["a", "b", "c"])
    expect(options.find((o) => o.value === "a")?.depth).toBe(0)
  })
})
