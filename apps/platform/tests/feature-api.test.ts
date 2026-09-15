import { describe, expect, test } from "bun:test"
import { organizationListSearch } from "../src/features/organizations/api"
import { geoAdminUnitsListSearch } from "../src/features/shared/api"

/**
 * Pilot feature-adapter tests (W1). These lock the query-string contract that
 * the split moved out of features/api.ts; the transport itself is covered by
 * packages/api tests.
 */
describe("organizations list query", () => {
  test("defaults to page 1 / 20 per page", () => {
    expect(organizationListSearch().toString()).toBe("page=1&per_page=20")
  })

  test("maps list params and drops empty values", () => {
    const search = organizationListSearch({
      page: 3,
      perPage: 50,
      q: "chi nhánh",
      sort: "code",
      order: "desc",
      is_active: "true",
      all: true,
      view: "tree",
      ignored: "",
    })
    expect(search.get("page")).toBe("3")
    expect(search.get("per_page")).toBe("50")
    expect(search.get("q")).toBe("chi nhánh")
    expect(search.get("sort")).toBe("code")
    expect(search.get("order")).toBe("desc")
    expect(search.get("is_active")).toBe("true")
    expect(search.get("all")).toBe("1")
    expect(search.get("view")).toBe("tree")
    expect(search.has("ignored")).toBe(false)
  })
})

describe("geo admin units list query", () => {
  test("keeps paging/sort and appends parent_code + level", () => {
    const search = geoAdminUnitsListSearch({
      page: 2,
      perPage: 100,
      sort: "code",
      parentCode: "01",
      level: 2,
    })
    expect(search.get("page")).toBe("2")
    expect(search.get("per_page")).toBe("100")
    expect(search.get("sort")).toBe("code")
    expect(search.get("parent_code")).toBe("01")
    expect(search.get("level")).toBe("2")
  })

  test("omits absent geo filters", () => {
    expect(geoAdminUnitsListSearch().toString()).toBe("page=1&per_page=20")
  })
})
