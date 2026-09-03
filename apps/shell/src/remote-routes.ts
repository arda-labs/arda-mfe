import { lazyRemote, type PreloadableRemote } from "./lazy-remote"

export const IamRoutes = lazyRemote(() => import("iam/Routes"))
export const PlatformRoutes = lazyRemote(() => import("platform/Routes"))
export const FinanceRoutes = lazyRemote(() => import("finance/Routes"))
export const HrmRoutes = lazyRemote(() => import("hrm/Routes"))
export const AccountRoutes = lazyRemote(() => import("account/Routes"))
export const CrmRoutes = lazyRemote(() => import("crm/Routes"))
export const WorkflowRoutes = lazyRemote(() => import("workflow/Routes"))
export const AiRoutes = lazyRemote(() => import("ai/Routes"))

const remoteRoutes: Array<{
  prefixes: string[]
  component: PreloadableRemote
}> = [
  {
    prefixes: [
      "/admin/users",
      "/admin/groups",
      "/admin/roles",
      "/admin/permissions",
      "/admin/audit",
      "/admin/settings",
      "/admin/tenants",
    ],
    component: IamRoutes,
  },
  {
    prefixes: [
      "/admin/organizations",
      "/admin/parameters",
      "/admin/provinces",
      "/admin/wards",
      "/admin/lookups",
      "/admin/area-types",
      "/admin/areas",
      "/admin/credit-institutions",
      "/admin/templates",
      "/admin/calendar",
      "/admin/cutoff",
    ],
    component: PlatformRoutes,
  },
  { prefixes: ["/finance"], component: FinanceRoutes },
  { prefixes: ["/hrm"], component: HrmRoutes },
  { prefixes: ["/customers"], component: CrmRoutes },
  { prefixes: ["/workflow", "/workbench"], component: WorkflowRoutes },
  { prefixes: ["/ai/knowledge", "/ai/settings", "/ai/approvals"], component: AiRoutes },
  {
    prefixes: ["/my-account", "/in", "/settings"],
    component: AccountRoutes,
  },
]

export function preloadRemoteForPath(pathname: string) {
  const match = remoteRoutes.find(({ prefixes }) =>
    prefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  )
  return match?.component.preload(pathname).catch(() => undefined)
}
