import { describe, expect, test } from "bun:test"
import { FileText, Wallet } from "lucide-react"
import { containsHref, findActiveHref, type NavNode } from "../src/config/nav-config"

const tree: NavNode[] = [
  { href: "/", label: "Dashboard", icon: FileText },
  { href: "/finance/posting/single-entry", label: "Bút toán lẻ", icon: FileText },
  {
    id: "finance",
    label: "Tài chính",
    icon: Wallet,
    children: [
      { href: "/finance", label: "Tổng quan", icon: FileText },
      { href: "/finance/accounts", label: "Tài khoản", icon: FileText },
    ],
  },
]

describe("findActiveHref", () => {
  test("picks the most specific href, not every prefix", () => {
    expect(findActiveHref(tree, "/finance/posting/single-entry/init")).toBe(
      "/finance/posting/single-entry"
    )
  })

  test("falls back to the parent route when no deeper item matches", () => {
    expect(findActiveHref(tree, "/finance/journal")).toBe("/finance")
  })

  test("does not match on a partial path segment", () => {
    expect(findActiveHref(tree, "/finance-reports")).toBeUndefined()
  })

  test("root only matches itself", () => {
    expect(findActiveHref(tree, "/")).toBe("/")
    expect(findActiveHref(tree, "/hrm/employees")).toBeUndefined()
  })
})

describe("containsHref", () => {
  test("finds the active href inside a group", () => {
    expect(containsHref(tree[2]!, "/finance/accounts")).toBe(true)
    expect(containsHref(tree[2]!, "/finance/posting/single-entry")).toBe(false)
  })
})
