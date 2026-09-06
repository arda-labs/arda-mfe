import {
  BarChart3,
  BookOpen,
  Bot,
  Building2,
  Calendar,
  Circle,
  Clock,
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

/**
 * Icon names are free text in the plt_menus table (DB-driven navigation);
 * unmapped names degrade to a plain circle instead of breaking the sidebar.
 * Shared between the shell sidebar and the menu configuration CRUD page so
 * the icon picker can only offer names the sidebar can render.
 */
export const menuIconRegistry: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  settings: Settings,
  users: Users,
  groups: Users,
  shield: ShieldCheck,
  key: KeyRound,
  log: FileText,
  "file-text": FileText,
  building: Building2,
  org: Building2,
  sliders: SlidersHorizontal,
  list: ListTree,
  book: BookOpen,
  coins: Wallet,
  "id-card": IdCard,
  contact: IdCard,
  workflow: Calendar,
  clock: Clock,
  inbox: Inbox,
  sparkles: Sparkles,
  bot: Bot,
  wrench: Wrench,
  chart: BarChart3,
}

export function getMenuIcon(name: string): LucideIcon {
  return menuIconRegistry[name] ?? Circle
}

export const menuIconNames: string[] = Object.keys(menuIconRegistry).sort()
