import { describe, expect, test } from "bun:test"
import { buildTree, expandedToDepth, textMatches, valueIn } from "./tree"

type Unit = { id: string; parent?: string; code: string }
const units: Unit[] = [
  { id: "cn1-td", parent: "cn1", code: "CN1-TD" },
  { id: "hs", code: "HS" },
  { id: "hs-kt", parent: "hs", code: "HS-KT" },
  { id: "cn1", code: "CN1" },
  { id: "hs-td", parent: "hs", code: "HS-TD" },
  { id: "hs-td-1", parent: "hs-td", code: "HS-TD-1" },
  { id: "orphan", parent: "gone", code: "ORPHAN" },
]
const byCode = (a: Unit, b: Unit) => a.code.localeCompare(b.code)
const tree = () => buildTree(units, (u) => u.id, (u) => u.parent, byCode)

describe("buildTree", () => {
  test("nests children under parents, sorted, orphans at the root", () => {
    const { roots, children } = tree()
    expect(roots.map((u) => u.code)).toEqual(["CN1", "HS", "ORPHAN"])
    expect(children.get("hs")?.map((u) => u.code)).toEqual(["HS-KT", "HS-TD"])
    expect(children.get("hs-td")?.map((u) => u.code)).toEqual(["HS-TD-1"])
  })

  test("a self-parented row stays a root instead of vanishing", () => {
    const { roots } = buildTree([{ id: "x", parent: "x", code: "X" }], (u) => u.id, (u) => u.parent)
    expect(roots).toHaveLength(1)
  })
})

describe("expandedToDepth", () => {
  test("opens branches above the given depth only", () => {
    const { roots, children } = tree()
    expect(expandedToDepth(roots, children, (u) => u.id, 1)).toEqual({ cn1: true, hs: true })
    expect(expandedToDepth(roots, children, (u) => u.id, 2)).toEqual({
      cn1: true,
      hs: true,
      "hs-td": true,
    })
    expect(expandedToDepth(roots, children, (u) => u.id, 0)).toEqual({})
  })
})

describe("textMatches", () => {
  test("matches any value ignoring case and Vietnamese accents", () => {
    expect(textMatches("doanh nghiep", "HS-TD-DN", "Tổ tín dụng doanh nghiệp")).toBe(true)
    expect(textMatches("ĐƠN", "Đơn vị")).toBe(true)
    expect(textMatches("1011", "1011", "Tiền mặt")).toBe(true)
    expect(textMatches("xyz", "1011", undefined)).toBe(false)
    expect(textMatches("  ", "anything")).toBe(true)
  })
})

describe("valueIn", () => {
  test("single value, array or empty filter", () => {
    expect(valueIn("active", "active")).toBe(true)
    expect(valueIn("inactive", ["active"])).toBe(false)
    expect(valueIn("inactive", ["active", "inactive"])).toBe(true)
    expect(valueIn("x", [])).toBe(true)
    expect(valueIn("x", undefined)).toBe(true)
  })
})
