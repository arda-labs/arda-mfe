import { describe, expect, test } from "bun:test"
import type { WorkItem } from "../src/features/workbench/api/types"
import {
  CASE_VIEW_FALLBACK_URL,
  parseCaseViewRequest,
  pickCaseViewItem,
  safeReturnUrl,
} from "../src/features/workbench/utils/case-view"

describe("parseCaseViewRequest", () => {
  test("reads caseCode and returnUrl when mode=view", () => {
    const search = `?caseCode=DPM-20261018-000001&returnUrl=${encodeURIComponent(
      "/workbench/transaction-search?status=COMPLETED"
    )}&mode=view`
    expect(parseCaseViewRequest(search)).toEqual({
      caseCode: "DPM-20261018-000001",
      returnUrl: "/workbench/transaction-search?status=COMPLETED",
    })
  })

  test("caseCode alone is the burst-refetch hint, not a view request", () => {
    expect(parseCaseViewRequest("?caseCode=DPM-20261018-000001")).toBeNull()
    expect(parseCaseViewRequest("?caseCode=X&mode=act")).toBeNull()
  })

  test("needs a non-blank caseCode", () => {
    expect(parseCaseViewRequest("?mode=view")).toBeNull()
    expect(parseCaseViewRequest("?mode=view&caseCode=%20%20")).toBeNull()
  })

  test("falls back to transaction search for a missing or hostile returnUrl", () => {
    expect(parseCaseViewRequest("?mode=view&caseCode=X")?.returnUrl).toBe(
      CASE_VIEW_FALLBACK_URL
    )
    expect(
      parseCaseViewRequest(
        `?mode=view&caseCode=X&returnUrl=${encodeURIComponent("https://evil.example")}`
      )?.returnUrl
    ).toBe(CASE_VIEW_FALLBACK_URL)
  })
})

describe("safeReturnUrl", () => {
  test("accepts internal absolute paths with query and hash", () => {
    expect(safeReturnUrl("/workbench/transaction-search")).toBe(
      "/workbench/transaction-search"
    )
    expect(safeReturnUrl("/workbench/x?a=1&b=2#top")).toBe("/workbench/x?a=1&b=2#top")
  })

  test("rejects absolute and protocol-relative URLs", () => {
    for (const bad of [
      "https://evil.example/x",
      "//evil.example",
      "///evil.example",
      "javascript:alert(1)",
      "workbench/x",
      "",
    ]) {
      expect(safeReturnUrl(bad)).toBe(CASE_VIEW_FALLBACK_URL)
    }
    expect(safeReturnUrl(null)).toBe(CASE_VIEW_FALLBACK_URL)
    expect(safeReturnUrl(undefined)).toBe(CASE_VIEW_FALLBACK_URL)
  })

  test("rejects backslashes and control characters", () => {
    for (const bad of [
      "/\\evil.example",
      "/ok\\path",
      "/ok\npath",
      "/ok\rpath",
      "/ok\tpath",
      "/ok\u0000path",
      "/ok\u007fpath",
      "/ok path",
    ]) {
      expect(safeReturnUrl(bad)).toBe(CASE_VIEW_FALLBACK_URL)
    }
  })

  test("honours a custom fallback", () => {
    expect(safeReturnUrl("//x", "/home")).toBe("/home")
  })
})

function item(partial: Partial<WorkItem>): WorkItem {
  return {
    id: "w",
    caseCode: "C-1",
    formKey: "",
    updatedAt: "2026-10-18T00:00:00Z",
    ...partial,
  } as WorkItem
}

describe("pickCaseViewItem", () => {
  test("matches the exact caseCode only", () => {
    const items = [item({ id: "a", caseCode: "C-10" }), item({ id: "b", caseCode: "C-1" })]
    expect(pickCaseViewItem(items, "C-1")?.id).toBe("b")
    expect(pickCaseViewItem(items, "C-100")).toBeUndefined()
    expect(pickCaseViewItem([], "C-1")).toBeUndefined()
  })

  test("prefers an item with a formKey over a newer one without", () => {
    const items = [
      item({ id: "new", formKey: "", updatedAt: "2026-10-18T10:00:00Z" }),
      item({ id: "form", formKey: "dpm_product_register_v1.maker", updatedAt: "2026-10-18T09:00:00Z" }),
    ]
    expect(pickCaseViewItem(items, "C-1")?.id).toBe("form")
  })

  test("otherwise takes the most recently updated step", () => {
    const items = [
      item({ id: "old", formKey: "f", updatedAt: "2026-10-18T09:00:00Z" }),
      item({ id: "new", formKey: "f", updatedAt: "2026-10-18T10:00:00Z" }),
    ]
    expect(pickCaseViewItem(items, " C-1 ")?.id).toBe("new")
  })
})
