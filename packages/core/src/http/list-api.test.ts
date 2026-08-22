import { describe, expect, test } from "bun:test"
import { serializeListQuery } from "./list-api"

describe("serializeListQuery", () => {
  test("is stable when callers create filters in a different key order", () => {
    const first = serializeListQuery({
      page: 1,
      perPage: 20,
      status: "ACTIVE",
      organization_id: "org-1",
    })
    const second = serializeListQuery({
      organization_id: "org-1",
      status: "ACTIVE",
      perPage: 20,
      page: 1,
    })

    expect(first).toBe(second)
  })

  test("changes when a server-side query value changes", () => {
    expect(serializeListQuery({ page: 1, perPage: 20 })).not.toBe(
      serializeListQuery({ page: 2, perPage: 20 })
    )
  })
})
