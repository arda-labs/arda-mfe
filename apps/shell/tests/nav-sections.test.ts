import { describe, expect, test } from "bun:test"
import { FileText } from "lucide-react"
import type { PlatformMenuItem } from "@workspace/api"
import { groupNavBySection, type NavNode } from "../src/config/nav-config"
import { toNavNodes } from "../src/config/use-dynamic-nav"

const node = (label: string, section?: string): NavNode => ({
  label,
  icon: FileText,
  section,
})

function row(
  code: string,
  extra: Partial<PlatformMenuItem> = {}
): PlatformMenuItem {
  return {
    id: `id-${code}`,
    code,
    title: code,
    path: `/${code}`,
    icon: "",
    remote: "",
    required_permission: "",
    sort_order: 0,
    is_active: true,
    ...extra,
  }
}

describe("groupNavBySection", () => {
  test("ungrouped first, then departments in MENU_SECTIONS order", () => {
    const groups = groupNavBySection([
      node("Quản trị", "admin"),
      node("Tổng quan"),
      node("Tài chính", "accounting"),
      node("Tín dụng", "credit"),
      node("Tiền gửi", "funding"),
      node("Vốn", "funding"),
    ])
    expect(groups.map((g) => g.section)).toEqual([
      "",
      "credit",
      "funding",
      "accounting",
      "admin",
    ])
    expect(groups[2]!.items.map((n) => n.label)).toEqual(["Tiền gửi", "Vốn"])
  })

  test("unknown DB sections are kept after the known ones", () => {
    const groups = groupNavBySection([
      node("Chi nhánh", "branch_ops"),
      node("Tín dụng", "credit"),
    ])
    expect(groups.map((g) => g.section)).toEqual(["credit", "branch_ops"])
  })
})

describe("toNavNodes section", () => {
  test("uses the section served by platform-service", () => {
    const [root] = toNavNodes([row("finance", { section: "control" })])
    expect(root!.section).toBe("control")
  })

  test("infers the department from the code when the API has no section", () => {
    const roots = toNavNodes([row("deposit"), row("hrm"), row("dashboard")])
    const byCode = Object.fromEntries(roots.map((n) => [n.id, n.section]))
    expect(byCode).toEqual({ deposit: "funding", hrm: "hr", dashboard: undefined })
  })
})
