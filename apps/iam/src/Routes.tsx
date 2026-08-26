import "@workspace/i18n/apps/iam"
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

export default createRemoteRoutes({
  routes: [
    { prefix: "/admin/groups", component: GroupsPage },
    { prefix: "/admin/roles", component: RolesPage },
    { prefix: "/admin/permissions", component: PermissionsPage },
    { prefix: "/admin/audit", component: AuditPage },
    { prefix: "/admin/settings", component: SystemSettingsPage },
    { prefix: "/admin/tenants", component: TenantsPage },
  ],
  defaultComponent: UsersPage,
})
