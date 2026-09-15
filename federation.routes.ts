/** Shell render ownership and code preloading must consume this same registry. */
export const remoteRoutePrefixes = {
  iam: ["/admin/users", "/admin/groups", "/admin/roles", "/admin/permissions", "/admin/audit", "/admin/settings", "/admin/tenants", "/admin/resource-routes", "/admin/oauth-clients"],
  platform: ["/admin/organizations", "/admin/parameters", "/admin/provinces", "/admin/wards", "/admin/lookups", "/admin/area-types", "/admin/areas", "/admin/credit-institutions", "/admin/templates", "/admin/calendar", "/admin/cutoff", "/admin/jobs", "/admin/working-hours", "/admin/notifications", "/admin/menus"],
  finance: ["/finance"],
  hrm: ["/hrm"],
  account: ["/my-account", "/in", "/settings"],
  workflow: ["/workflow", "/workbench"],
  crm: ["/customers"],
  ai: ["/ai/knowledge", "/ai/settings", "/ai/approvals", "/ai/tools", "/ai/analytics"],
  loan: ["/loans"],
  mdm: ["/admin/mdm"],
  deposit: ["/deposit"],
  capital: ["/capital"],
  statistical: ["/statistical"],
} as const
export type RemoteName = keyof typeof remoteRoutePrefixes

export function resolveRemoteRoute(pathname: string) {
  for (const [name, prefixes] of Object.entries(remoteRoutePrefixes)) {
    for (const prefix of prefixes) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        return { name: name as RemoteName, prefix }
      }
    }
  }
  return undefined
}
