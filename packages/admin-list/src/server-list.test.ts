import { describe, expect, test } from "bun:test"
import {
  applyServerListFilters,
  buildServerListQuery,
  buildServerListQueryKey,
} from "./server-list"

const config = {
  defaultPageSize: 10,
  sortableColumns: ["code", "name", "is_active"],
  filters: [
    { urlKey: "q", apiKey: "q", mode: "text" },
    { urlKey: "name", apiKey: "q", mode: "text" },
    {
      urlKey: "is_active",
      mode: "single",
      allowedValues: ["true", "false"],
    },
  ],
} as const

describe("server list contract", () => {
  test("builds stable resource keys", () => {
    expect(
      buildServerListQueryKey(["crm", "customers"], {
        page: 1,
        status: "ACTIVE",
      })
    ).toEqual(
      buildServerListQueryKey(["crm", "customers"], {
        status: "ACTIVE",
        page: 1,
      })
    )
  })

  test("maps table and external filters to API parameters", () => {
    expect(
      buildServerListQuery(
        new URLSearchParams("page=2&perPage=50&name=arda&is_active=true"),
        config
      )
    ).toEqual({ page: 2, perPage: 50, q: "arda", is_active: "true" })
  })

  test("uses external q precedence and validates single filters", () => {
    const query = buildServerListQuery(
      new URLSearchParams("q=external&name=table&is_active=true,false"),
      config
    )
    expect(query.q).toBe("external")
    expect(query.is_active).toBeUndefined()
  })

  test("accepts only declared sort columns", () => {
    const valid = buildServerListQuery(
      new URLSearchParams(
        `sort=${encodeURIComponent(JSON.stringify([{ id: "name", desc: true }]))}`
      ),
      config
    )
    const invalid = buildServerListQuery(
      new URLSearchParams(
        `sort=${encodeURIComponent(JSON.stringify([{ id: "password", desc: true }]))}`
      ),
      config
    )
    expect(valid).toMatchObject({ sort: "name", order: "desc" })
    expect(invalid.sort).toBeUndefined()
  })

  test("applies advanced filters and resets page", () => {
    const next = applyServerListFilters(
      new URLSearchParams("page=4&perPage=50&is_active=false"),
      { q: "arda", is_active: true, unknown: "ignored" },
      config
    )
    expect(next.get("page")).toBe("1")
    expect(next.get("perPage")).toBe("50")
    expect(next.get("q")).toBe("arda")
    expect(next.get("is_active")).toBe("true")
    expect(next.has("unknown")).toBe(false)
  })
})
