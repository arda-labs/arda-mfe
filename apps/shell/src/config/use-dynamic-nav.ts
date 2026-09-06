import { useEffect, useState } from "react"
import { getMenuIcon } from "@workspace/ui/config/menu-icons"
import { fetchEffectiveMenu, type PlatformMenuItem } from "@workspace/api"
import { navItems, type NavNode } from "./nav-config"

function toNavNodes(items: PlatformMenuItem[]): NavNode[] {
  const byId = new Map<string, NavNode>()
  const byCode = new Map<string, NavNode>()
  const codeById = new Map<string, string>()
  const roots: NavNode[] = []

  const sorted = [...items].sort((a, b) =>
    a.sort_order !== b.sort_order
      ? a.sort_order - b.sort_order
      : a.code.localeCompare(b.code)
  )

  for (const item of sorted) {
    const node: NavNode = {
      id: item.code,
      href: item.path || undefined,
      label: item.title,
      icon: getMenuIcon(item.icon),
      // required_permission may hold a comma-separated list; empty = visible to all.
      permissions: item.required_permission
        ? item.required_permission
            .split(",")
            .map((code) => code.trim())
            .filter(Boolean)
        : undefined,
    }
    byId.set(item.id, node)
    byCode.set(item.code, node)
    codeById.set(item.id, item.code)
  }
  for (const item of sorted) {
    const node = byId.get(item.id)
    if (!node) continue
    // Resolve the parent by row id; when the parent row itself was replaced by
    // a tenant override (same code, new id), fall back to its code.
    const parent =
      (item.parent_id ? byId.get(item.parent_id) : undefined) ??
      (item.parent_id
        ? byCode.get(codeById.get(item.parent_id) ?? "")
        : undefined)
    if (parent) {
      parent.children = [...(parent.children ?? []), node]
    } else {
      roots.push(node)
    }
  }
  return roots
}

export type DynamicNavState = {
  items: NavNode[]
  source: "menu-api" | "static-fallback"
}

/**
 * DB-driven sidebar (plt_menus via platform-service). Falls back to the
 * static route table when the menu API fails or returns nothing, so a
 * platform outage degrades navigation instead of removing it. Permission
 * filtering happens at the caller (filterNavItems on the session user).
 */
export function useDynamicNavItems(): DynamicNavState {
  const [state, setState] = useState<DynamicNavState>({
    items: navItems,
    source: "static-fallback",
  })

  useEffect(() => {
    let cancelled = false
    fetchEffectiveMenu()
      .then((items) => {
        if (cancelled || items.length === 0) return
        const mapped = toNavNodes(items)
        if (mapped.length > 0) {
          setState({ items: mapped, source: "menu-api" })
        }
      })
      .catch(() => {
        // keep static fallback silently
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
