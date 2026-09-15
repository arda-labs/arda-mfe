import { createAppLocaleLoader } from "@workspace/i18n"
const locales = createAppLocaleLoader("iam", {
  "vi-VN": () => import("../locales/vi-VN.json"),
  "en-US": () => import("../locales/en-US.json"),
})
import { QueryProvider } from "@workspace/query/provider"
import { createRemoteRoutes, lazyWithPreload } from "@workspace/ui/lib/lazy"

const UsersPage = lazyWithPreload(() =>
  import("@/features/users/page").then((m) => ({ default: m.UsersPage }))
)
const GroupsPage = lazyWithPreload(() =>
  import("@/features/groups/page").then((m) => ({ default: m.GroupsPage }))
)
const RolesPage = lazyWithPreload(() =>
  import("@/features/roles/page").then((m) => ({ default: m.RolesPage }))
)
const PermissionsPage = lazyWithPreload(() =>
  import("@/features/permissions/page").then((m) => ({
    default: m.PermissionsPage,
  }))
)
const AuditPage = lazyWithPreload(() =>
  import("@/features/audit/page").then((m) => ({ default: m.AuditPage }))
)
const SystemSettingsPage = lazyWithPreload(() =>
  import("@/features/system-settings/page").then((m) => ({
    default: m.SystemSettingsPage,
  }))
)
const TenantsPage = lazyWithPreload(() =>
  import("@/features/tenants/page").then((m) => ({ default: m.TenantsPage }))
)
const ResourceRoutesPage = lazyWithPreload(() =>
  import("@/features/resource-routes/page").then((m) => ({
    default: m.ResourceRoutesPage,
  }))
)
const OAuthClientsPage = lazyWithPreload(() =>
  import("@/features/oauth-clients/page").then((m) => ({
    default: m.OAuthClientsPage,
  }))
)

export default createRemoteRoutes({
  locales,
  defaultPrefixes: ["/admin/users"],
  routes: [
    { prefix: "/admin/groups", component: GroupsPage },
    { prefix: "/admin/roles", component: RolesPage },
    { prefix: "/admin/permissions", component: PermissionsPage },
    { prefix: "/admin/audit", component: AuditPage },
    { prefix: "/admin/settings", component: SystemSettingsPage },
    { prefix: "/admin/tenants", component: TenantsPage },
    { prefix: "/admin/resource-routes", component: ResourceRoutesPage },
    { prefix: "/admin/oauth-clients", component: OAuthClientsPage },
  ],
  defaultComponent: UsersPage,
  wrapper: QueryProvider,
})
