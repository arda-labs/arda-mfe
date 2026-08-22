import { describe, expect, test } from "bun:test"
import { buildSearchParams } from "./query"

describe("buildSearchParams", () => {
  test("omits empty values but preserves false and zero", () => {
    expect(
      buildSearchParams({
        empty: "",
        missing: undefined,
        disabled: false,
        page: 0,
      }).toString()
    ).toBe("disabled=false&page=0")
  })

  test("supports repeated values", () => {
    expect(
      buildSearchParams({ event_type: ["LOGIN", "LOGOUT"] }).toString()
    ).toBe("event_type=LOGIN&event_type=LOGOUT")
  })
})
