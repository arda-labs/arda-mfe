import { describe, expect, test } from "bun:test"
import { fetchAllPages } from "../src/features/finance/api/accounts"

const pageOf = (total: number, perPage: number) => async (page: number) => {
  const start = (page - 1) * perPage
  const items = Array.from({ length: Math.max(0, Math.min(perPage, total - start)) }, (_, i) => ({
    id: `a${start + i}`,
  }))
  return { items, total, page, per_page: perPage }
}

describe("fetchAllPages", () => {
  test("reads every page past the BE caps", async () => {
    const calls: number[] = []
    const fetchPage = pageOf(530, 100)
    const all = await fetchAllPages(async (page) => {
      calls.push(page)
      return fetchPage(page)
    })
    expect(all).toHaveLength(530)
    expect(calls.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6])
  })

  test("one request when everything fits, duplicates dropped", async () => {
    expect(await fetchAllPages(pageOf(7, 100))).toHaveLength(7)
    const dupes = await fetchAllPages(async (page) => ({
      items: [{ id: "x" }, { id: page === 1 ? "y" : "x" }],
      total: 4,
      page,
      per_page: 2,
    }))
    expect(dupes.map((item) => item.id)).toEqual(["x", "y"])
  })
})
