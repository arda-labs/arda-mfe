import { describe, expect, test } from "bun:test"
import { normalizeAccountsPage } from "../src/features/finance/api/accounts"

/**
 * W2 adapter test: locks the BE `{ accounts: [...] }` → ListResponse
 * normalization that the finance api split moved into api/accounts.ts.
 */
describe("normalizeAccountsPage", () => {
  const account = {
    id: "a1",
    tenantId: "t1",
    code: "1111",
    name: "Tiền mặt",
    type: "ASSET",
    normalBalance: "DEBIT",
    currency: "VND",
    isActive: true,
    createdAt: "2026-01-01",
  }

  test("keeps paging fields when the BE returns them", () => {
    const result = normalizeAccountsPage({
      accounts: [account],
      page: 3,
      per_page: 50,
      total: 120,
    })
    expect(result.items).toHaveLength(1)
    expect(result.page).toBe(3)
    expect(result.per_page).toBe(50)
    expect(result.total).toBe(120)
  })

  test("falls back to params and row count when the BE omits paging", () => {
    const result = normalizeAccountsPage(
      { accounts: [account] },
      { page: 2, perPage: 25 }
    )
    expect(result.page).toBe(2)
    expect(result.per_page).toBe(25)
    expect(result.total).toBe(1)
  })

  test("treats a missing accounts array as an empty page", () => {
    const result = normalizeAccountsPage({})
    expect(result.items).toEqual([])
    expect(result.page).toBe(1)
    expect(result.per_page).toBe(1)
    expect(result.total).toBe(0)
  })
})
