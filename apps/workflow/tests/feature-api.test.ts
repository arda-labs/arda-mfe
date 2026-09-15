import { describe, expect, test } from "bun:test"
import {
  listParamsToQuery,
  operateQuery,
} from "../src/features/workflow/api/internal"
import { workItemsExportUrl } from "../src/features/workflow/api/analytics"

/**
 * W2 adapter tests: lock the query-string helpers that the workflow api split
 * moved into api/internal.ts, plus the pure export-URL builder.
 */
describe("listParamsToQuery", () => {
  test("returns an empty string without params", () => {
    expect(listParamsToQuery()).toBe("")
  })

  test("keeps only provided catalog filters", () => {
    expect(listParamsToQuery({ q: "hồ sơ", sort: "code", order: "desc" })).toBe(
      "?q=h%E1%BB%93+s%C6%A1&sort=code&order=desc"
    )
    expect(listParamsToQuery({ order: "asc" })).toBe("?order=asc")
  })
})

describe("operateQuery", () => {
  test("skips empty and undefined values", () => {
    expect(operateQuery()).toBe("")
    expect(
      operateQuery({
        state: "ACTIVE",
        pageSize: 20,
        cursor: undefined,
        bpmnProcessId: "",
      })
    ).toBe("?state=ACTIVE&pageSize=20")
  })
})

describe("workItemsExportUrl", () => {
  test("builds the export path with an optional direction", () => {
    expect(workItemsExportUrl()).toBe("/api/workflow/work-items/export")
    expect(workItemsExportUrl({ direction: "incoming" })).toBe(
      "/api/workflow/work-items/export?direction=incoming"
    )
  })
})
