import { describe, expect, test } from "bun:test"
import { buildServerListQueryKey } from "./server-list"

describe("buildServerListQueryKey", () => {
  test("does not depend on object identity or filter key order", () => {
    const first = buildServerListQueryKey(["crm", "customers"], {
      page: 1,
      status: "ACTIVE",
    })
    const second = buildServerListQueryKey(["crm", "customers"], {
      status: "ACTIVE",
      page: 1,
    })

    expect(first).toEqual(second)
  })

  test("keeps resource variants in separate caches", () => {
    const list = buildServerListQueryKey(
      ["platform", "organizations", "list"],
      {
        page: 1,
      }
    )
    const tree = buildServerListQueryKey(
      ["platform", "organizations", "tree"],
      {
        view: "tree",
      }
    )

    expect(list).not.toEqual(tree)
  })
})
