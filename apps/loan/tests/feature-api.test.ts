import { describe, expect, test } from "bun:test"
import { listQuery } from "../src/features/api/list-query"
import { adjustmentFieldValue } from "../src/features/api/adjustments"

/**
 * W3 adapter tests: lock the legacy list-param contract (all=true fallback)
 * and the payload-aware adjustment field reader that the loan api split moved
 * out of features/api.ts.
 */
describe("listQuery", () => {
  test("server-paged calls keep page/per_page and drop the legacy all flag", () => {
    const search = listQuery({ page: 3, per_page: 50, status: "PENDING" })
    expect(search.get("page")).toBe("3")
    expect(search.get("per_page")).toBe("50")
    expect(search.get("status")).toBe("PENDING")
    expect(search.has("all")).toBe(false)
  })

  test("legacy fetch-all callers keep all=true", () => {
    const search = listQuery({ contract_code: "LN001", status: "ACTIVE" })
    expect(search.get("all")).toBe("true")
    expect(search.get("contract_code")).toBe("LN001")
    expect(search.get("status")).toBe("ACTIVE")
  })

  test("empty params default to the fetch-all mode", () => {
    expect(listQuery().toString()).toBe("all=true")
  })
})

describe("adjustmentFieldValue", () => {
  const row = {
    id: "a1",
    tenant_id: "t1",
    kind: "rate-change",
    contract_code: "LN001",
    status: "PENDING",
    amount_minor: 1250000,
    payload: { new_rate: 9.5, nested: { deep: 1 } },
  }

  test("reads top-level fields", () => {
    expect(adjustmentFieldValue(row, "amount_minor")).toBe(1250000)
  })

  test("reads payload-prefixed fields", () => {
    expect(adjustmentFieldValue(row, "payload.new_rate")).toBe(9.5)
  })

  test("ignores missing or non-primitive values", () => {
    expect(adjustmentFieldValue(row, "payload.missing")).toBeUndefined()
    expect(adjustmentFieldValue(row, "payload.nested")).toBeUndefined()
    expect(adjustmentFieldValue(row, "decision_note")).toBeUndefined()
  })
})
