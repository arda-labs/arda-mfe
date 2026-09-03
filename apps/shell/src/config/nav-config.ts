import type { LucideIcon } from "lucide-react"
import {
  BookOpen,
  Building2,
  Calendar,
  Clock,
  FileText,
  LayoutDashboard,
  ListTree,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react"
import type { MessageKey } from "@workspace/i18n"
import type { AuthUser } from "@workspace/auth/store"
import { hasAnyPermission } from "@workspace/auth/store"

export type NavNode = {
  href?: string
  labelKey: MessageKey
  label?: string
  icon: LucideIcon
  permissions?: string[]
  children?: NavNode[]
}

export const navItems: NavNode[] = [
  { href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  {
    href: "/ai",
    labelKey: "nav.ai",
    icon: Sparkles,
    permissions: ["ai.assistant.use"],
  },
  {
    labelKey: "nav.ai_center",
    icon: Sparkles,
    permissions: ["ai.admin", "ai.knowledge.manage", "superadmin", "platform.manage"],
    children: [
      {
        href: "/ai/admin/knowledge",
        labelKey: "nav.ai_center.knowledge",
        icon: BookOpen,
        permissions: ["ai.admin", "ai.knowledge.manage", "superadmin", "platform.manage"],
      },
      {
        href: "/ai/admin/settings",
        labelKey: "nav.ai_center.settings",
        icon: SlidersHorizontal,
        permissions: ["ai.admin", "superadmin", "platform.manage"],
      },
    ],
  },
  {
    labelKey: "nav.admin",
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
        href: "/finance/transactions",
        labelKey: "nav.finance.transactions",
        icon: FileText,
      },
      {
        href: "/finance/approvals",
        labelKey: "nav.finance.approvals",
        icon: ShieldCheck,
      },
      {
        href: "/finance/trial-balance",
        labelKey: "nav.finance.trial_balance",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    labelKey: "nav.hrm._self",
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
    ],
  },
]

export function isNodeActive(item: NavNode, pathname: string): boolean {
  if (item.href)
    return item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  return Boolean(item.children?.some((child) => isNodeActive(child, pathname)))
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

export function getNavNodeId(item: NavNode) {
  return item.href ?? item.labelKey
}

export function getNavLabel(item: NavNode, t: (key: MessageKey) => string) {
  return item.label ?? t(item.labelKey)
}
