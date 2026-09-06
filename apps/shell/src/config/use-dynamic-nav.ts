import { useEffect, useState } from "react"
import {
  BarChart3,
  BookOpen,
  Bot,
  Building2,
  Calendar,
  Circle,
  FileText,
  IdCard,
  Inbox,
  KeyRound,
  LayoutDashboard,
  ListTree,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import { fetchEffectiveMenu, type PlatformMenuItem } from "@workspace/api"
import type { AuthUser } from "@workspace/auth/store"
import { navItems, type NavNode } from "./nav-config"

// Icon names are free text in plt_menus; unmapped names degrade to a plain
// circle instead of breaking the sidebar.
const iconRegistry: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  settings: Settings,
  users: Users,
  groups: Users,
  shield: ShieldCheck,
  key: KeyRound,
  log: FileText,
  building: Building2,
  org: Building2,
  sliders: SlidersHorizontal,
  list: ListTree,
  book: BookOpen,
  coins: Wallet,
  "id-card": IdCard,
  contact: IdCard,
  workflow: Calendar,
  inbox: Inbox,
  sparkles: Sparkles,
  bot: Bot,
  wrench: Wrench,
}

function toNavNodes(items: PlatformMenuItem[]): NavNode[] {
  const byId = new Map<string, NavNode>()
  const roots: NavNode[] = []

  const sorted = [...items].sort((a, b) =>
    a.sort_order !== b.sort_order
      ? a.sort_order - b.sort_order
      : a.code.localeCompare(b.code)
  )

  for (const item of sorted) {
    const icon = iconRegistry[item.icon] ?? Circle
    const node: NavNode = {
      id: item.code,
      href: item.path || undefined,
      label: item.title,
      icon,
      permissions: item.required_permission ? [item.required_permission] : undefined,
    }
    byId.set(item.id, node)
  }
  for (const item of sorted) {
    const node = byId.get(item.id)
    if (!node) continue
    const parent = item.parent_id ? byId.get(item.parent_id) : undefined
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
 * platform outage degrades navigation instead of removing it.
 */
export function useDynamicNavItems(user: AuthUser | null): DynamicNavState {
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
