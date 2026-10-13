import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  BookOpen,
  Building2,
  Calculator,
  Calendar,
  Clock,
  FileText,
  Inbox,
  LayoutDashboard,
  ListTree,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wallet,
  Wrench,
} from "lucide-react"
import { MENU_SECTIONS, type MenuSection } from "@workspace/api"
import type { MessageKey } from "@workspace/i18n"
import type { AuthUser } from "@workspace/auth/store"
import { hasAnyPermission } from "@workspace/auth/store"

export type NavNode = {
  href?: string
  /** Stable id for group nodes without an href (menu code or i18n key). */
  id?: string
  labelKey?: MessageKey
  label?: string
  icon: LucideIcon
  permissions?: string[]
  /** Sidebar department of a top-level node (MENU_SECTIONS code). */
  section?: string
  children?: NavNode[]
}

export const navItems: NavNode[] = [
  { href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  {
    labelKey: "nav.ai_center",
    section: "shared",
    icon: Sparkles,
    permissions: ["ai.admin", "ai.knowledge.manage", "superadmin", "platform.manage"],
    children: [
      {
        href: "/ai/knowledge",
        labelKey: "nav.ai_center.knowledge",
        icon: BookOpen,
        permissions: ["ai.admin", "ai.knowledge.manage", "superadmin", "platform.manage"],
      },
      {
        href: "/ai/settings",
        labelKey: "nav.ai_center.settings",
        icon: SlidersHorizontal,
        permissions: ["ai.admin", "superadmin", "platform.manage"],
      },
      {
        href: "/ai/approvals",
        labelKey: "nav.ai_center.approvals",
        icon: ShieldCheck,
        permissions: ["ai.admin", "superadmin", "platform.manage"],
      },
      {
        href: "/ai/tools",
        labelKey: "nav.ai_center.tools",
        icon: Wrench,
        permissions: ["ai.admin", "superadmin", "platform.manage"],
      },
      {
        href: "/ai/analytics",
        labelKey: "nav.ai_center.analytics",
        icon: BarChart3,
        permissions: ["ai.admin", "superadmin", "platform.manage"],
      },
    ],
  },
  {
    labelKey: "nav.admin",
    section: "admin",
    icon: Users,
    children: [
      {
        href: "/admin/users",
        labelKey: "nav.admin.users",
        icon: Users,
        permissions: ["iam.user.read"],
      },
      {
        href: "/admin/groups",
        labelKey: "nav.admin.groups",
        icon: Users,
        permissions: ["iam.group.read"],
      },
      {
        href: "/admin/roles",
        labelKey: "nav.admin.roles",
        icon: Users,
        permissions: ["iam.role.read"],
      },
      {
        href: "/admin/permissions",
        labelKey: "nav.admin.permissions",
        icon: ShieldCheck,
        permissions: ["iam.permission.read"],
      },
      {
        href: "/admin/audit",
        labelKey: "nav.admin.audit",
        icon: FileText,
        permissions: ["iam.user.read"],
      },
      {
        href: "/admin/menus",
        labelKey: "nav.admin.menus",
        icon: ListTree,
        permissions: ["platform.manage"],
      },
      {
        href: "/admin/settings",
        labelKey: "nav.admin.system_settings",
        icon: Settings,
        permissions: ["platform.manage"],
      },
      {
        href: "/admin/tenants",
        labelKey: "nav.admin.tenants",
        icon: Building2,
        permissions: ["superadmin"],
      },
    ],
  },
  {
    labelKey: "nav.workbench",
    section: "shared",
    icon: Clock,
    children: [
      {
        href: "/workbench/drafts",
        labelKey: "nav.workbench.drafts",
        icon: FileText,
      },
      {
        href: "/workbench/incoming-transactions",
        labelKey: "nav.workbench.incoming_transactions",
        icon: FileText,
      },
      {
        href: "/workbench/outgoing-transactions",
        labelKey: "nav.workbench.outgoing_transactions",
        icon: FileText,
      },
      {
        href: "/workbench/transaction-search",
        labelKey: "nav.workbench.transaction_search",
        icon: ListTree,
      },
    ],
  },
  {
    labelKey: "nav.customer_members",
    section: "shared",
    icon: Users,
    children: [
      {
        href: "/customers/registrations",
        labelKey: "nav.customer_members.registrations",
        icon: FileText,
      },
      {
        href: "/customers/profiles",
        labelKey: "nav.customer_members.profiles",
        icon: Users,
      },
      {
        href: "/customers/risk-cases",
        labelKey: "nav.customer_members.risk_cases",
        icon: ShieldCheck,
      },
    ],
  },
  {
    labelKey: "nav.finance",
    section: "accounting",
    icon: Wallet,
    children: [
      {
        href: "/finance/accounting-config",
        labelKey: "nav.finance.accounting_config",
        icon: Settings,
      },
      {
        href: "/finance/accounts",
        labelKey: "nav.finance.accounts",
        icon: Wallet,
      },
      {
        href: "/finance/posting/single-entry",
        labelKey: "nav.finance.posting.single",
        icon: FileText,
      },
      {
        href: "/finance/posting/double-entry",
        labelKey: "nav.finance.posting.double",
        icon: FileText,
      },
      {
        href: "/finance/posting/off-balance",
        labelKey: "nav.finance.posting.off_balance",
        icon: FileText,
      },
      {
        href: "/finance/posting/closing",
        labelKey: "nav.finance.posting.closing",
        icon: FileText,
      },
      {
        href: "/finance/posting/cancellation",
        labelKey: "nav.finance.posting.cancellation",
        icon: FileText,
      },
      {
        href: "/finance/trial-balance",
        labelKey: "nav.finance.trial_balance",
        icon: LayoutDashboard,
      },
      {
        href: "/finance/statements",
        labelKey: "nav.finance.statements",
        icon: FileText,
      },
      {
        href: "/finance/opening-balances",
        labelKey: "nav.finance.opening_balances",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    labelKey: "nav.hrm._self",
    section: "hr",
    icon: Users,
    children: [
      {
        href: "/hrm/positions",
        labelKey: "nav.hrm.positions",
        icon: Users,
        permissions: ["hrm.read"],
      },
      {
        href: "/hrm/job-titles",
        labelKey: "nav.hrm.job_titles",
        icon: FileText,
        permissions: ["hrm.read"],
      },
      {
        href: "/hrm/org-units",
        labelKey: "nav.hrm.org_units",
        icon: ListTree,
        permissions: ["hrm.read"],
      },
      {
        href: "/hrm/registrations",
        labelKey: "nav.hrm.registrations",
        icon: FileText,
        permissions: ["hrm.read"],
      },
      {
        href: "/hrm/employees",
        labelKey: "nav.hrm.employees",
        icon: Users,
        permissions: ["hrm.read"],
      },
    ],
  },
  {
    labelKey: "nav.platform",
    section: "admin",
    icon: Settings,
    children: [
      {
        href: "/admin/organizations",
        labelKey: "nav.platform.organizations",
        icon: Building2,
        permissions: ["platform.read"],
      },
      {
        href: "/admin/parameters",
        labelKey: "nav.platform.parameters",
        icon: SlidersHorizontal,
        permissions: ["platform.manage"],
      },
      {
        href: "/admin/provinces",
        labelKey: "nav.platform.provinces",
        icon: Building2,
        permissions: ["platform.read"],
      },
      {
        href: "/admin/wards",
        labelKey: "nav.platform.wards",
        icon: Building2,
        permissions: ["platform.read"],
      },
      {
        href: "/admin/lookups",
        labelKey: "nav.platform.lookups",
        icon: ListTree,
        permissions: ["platform.manage"],
      },
      {
        href: "/admin/area-types",
        labelKey: "nav.platform.area_types",
        icon: ListTree,
        permissions: ["platform.manage"],
      },
      {
        href: "/admin/areas",
        labelKey: "nav.platform.areas",
        icon: Building2,
        permissions: ["platform.read"],
      },
      {
        href: "/admin/credit-institutions",
        labelKey: "nav.platform.credit_institutions",
        icon: Building2,
        permissions: ["platform.read"],
      },
      {
        href: "/admin/templates",
        labelKey: "nav.platform.templates",
        icon: FileText,
        permissions: ["platform.manage"],
      },
      {
        href: "/admin/calendar",
        labelKey: "nav.platform.calendar",
        icon: Calendar,
        permissions: ["platform.manage"],
      },
      {
        href: "/admin/cutoff",
        labelKey: "nav.platform.cutoff",
        icon: Clock,
        permissions: ["platform.manage"],
      },
    ],
  },
  {
    labelKey: "nav.workflow",
    section: "shared",
    icon: ListTree,
    children: [
      {
        href: "/workflow/case-types",
        labelKey: "nav.workflow.case_types",
        icon: ListTree,
      },
      {
        href: "/workflow/process-configs",
        labelKey: "nav.workflow.process_configs",
        icon: Settings,
      },
      {
        href: "/workflow/sla-policies",
        labelKey: "nav.workflow.sla_policies",
        icon: Clock,
      },
      {
        href: "/workflow/description-templates",
        labelKey: "nav.workflow.description_templates",
        icon: FileText,
      },
      {
        href: "/workflow/roles",
        labelKey: "nav.workflow.roles",
        icon: Users,
      },
      {
        href: "/workflow/monitoring",
        labelKey: "nav.workflow.monitoring",
        icon: LayoutDashboard,
      },
      {
        href: "/workflow/dashboard",
        labelKey: "nav.workflow.dashboard",
        icon: BarChart3,
      },
    ],
  },
  {
    labelKey: "nav.loan",
    section: "credit",
    icon: Wallet,
    children: [
      {
        href: "/loans",
        labelKey: "nav.loan.contracts",
        icon: FileText,
        permissions: ["loan.read"],
      },
      {
        href: "/loans/products",
        labelKey: "nav.loan.products",
        icon: ListTree,
        permissions: ["loan.read"],
      },
      {
        href: "/loans/disbursements",
        labelKey: "nav.loan.disbursements",
        icon: Wallet,
        permissions: ["loan.read"],
      },
      {
        href: "/loans/collections",
        labelKey: "nav.loan.collections",
        icon: Inbox,
        permissions: ["loan.read"],
      },
      {
        href: "/loans/vfu",
        labelKey: "nav.loan.vfu",
        icon: FileText,
        permissions: ["loan.read"],
      },
      {
        href: "/loans/adjustments",
        labelKey: "nav.loan.adjustments",
        icon: SlidersHorizontal,
        permissions: ["loan.read"],
      },
      {
        href: "/loans/repay-plan",
        labelKey: "nav.loan.repay_plan",
        icon: ListTree,
        permissions: ["loan.read"],
      },
      {
        href: "/loans/dossier",
        labelKey: "nav.loan.dossier",
        icon: FileText,
        permissions: ["loan.read"],
      },
      {
        href: "/loans/general-provision",
        labelKey: "nav.loan.general_provision",
        icon: Calculator,
        permissions: ["loan.read"],
      },
    ],
  },
]

function matchesPath(href: string, pathname: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * The single menu href that owns `pathname`: the longest matching href in the
 * tree, so a group such as "/finance" and its leaf "/finance/posting/single-entry"
 * are never highlighted together.
 */
export function findActiveHref(
  items: NavNode[],
  pathname: string
): string | undefined {
  let best: string | undefined
  const visit = (nodes: NavNode[]) => {
    for (const node of nodes) {
      if (
        node.href &&
        matchesPath(node.href, pathname) &&
        node.href.length > (best?.length ?? -1)
      ) {
        best = node.href
      }
      if (node.children?.length) visit(node.children)
    }
  }
  visit(items)
  return best
}

export function containsHref(item: NavNode, href: string | undefined): boolean {
  if (!href) return false
  if (item.href === href) return true
  return Boolean(item.children?.some((child) => containsHref(child, href)))
}

export function filterNavItems(items: NavNode[], user: AuthUser | null): NavNode[] {
  const visible: NavNode[] = []
  for (const item of items) {
    const children = item.children
      ? filterNavItems(item.children, user)
      : undefined
    if (!hasAnyPermission(user, item.permissions ?? []) && !children?.length)
      continue
    visible.push({ ...item, children })
  }
  return visible
}

/**
 * Department for menu rows served without a section (platform-service builds
 * before plt_menus.section). Keys are plt_menus codes.
 */
export const DEFAULT_MENU_SECTION_BY_CODE: Record<string, MenuSection> = {
  "admin.loan": "credit",
  deposit: "funding",
  capital: "funding",
  finance: "accounting",
  statistical: "control",
  hrm: "hr",
  customers: "shared",
  workflow: "shared",
  workbench: "shared",
  ai_center: "shared",
  admin: "admin",
}

export type NavSectionGroup = {
  /** MENU_SECTIONS code, another code from the DB, or "" for ungrouped. */
  section: string
  items: NavNode[]
}

/**
 * Splits top-level nodes into department groups for the sidebar. Ungrouped
 * nodes (the dashboard) come first, then the known departments in
 * MENU_SECTIONS order, then any other section code in first-seen order.
 */
export function groupNavBySection(items: NavNode[]): NavSectionGroup[] {
  const groups = new Map<string, NavNode[]>()
  for (const item of items) {
    const section = item.section ?? ""
    groups.set(section, [...(groups.get(section) ?? []), item])
  }
  const order = [
    "",
    ...MENU_SECTIONS,
    ...[...groups.keys()].filter(
      (key) => key !== "" && !(MENU_SECTIONS as readonly string[]).includes(key)
    ),
  ]
  return order
    .filter((section) => groups.has(section))
    .map((section) => ({ section, items: groups.get(section) ?? [] }))
}

export function getNavNodeId(item: NavNode) {
  return item.href ?? item.id ?? item.labelKey ?? item.label ?? ""
}

export function getNavLabel(item: NavNode, t: (key: MessageKey) => string) {
  if (item.label) return item.label
  return item.labelKey ? t(item.labelKey) : ""
}
