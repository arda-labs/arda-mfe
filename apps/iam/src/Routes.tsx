import "@workspace/i18n/apps/iam"
import { createRemoteRoutes, lazyWithPreload } from "@workspace/ui/lib/lazy"

const UsersPage = lazyWithPreload(() =>
  import("@/features/iam/users/page").then((m) => ({ default: m.UsersPage }))
)
const GroupsPage = lazyWithPreload(() =>
  import("@/features/iam/groups/page").then((m) => ({ default: m.GroupsPage }))
)
const RolesPage = lazyWithPreload(() =>
  import("@/features/iam/roles/page").then((m) => ({ default: m.RolesPage }))
)
const PermissionsPage = lazyWithPreload(() =>
  import("@/features/iam/permissions/page").then((m) => ({
    default: m.PermissionsPage,
  }))
)
const AuditPage = lazyWithPreload(() =>
  import("@/features/iam/audit/page").then((m) => ({ default: m.AuditPage }))
)
const SystemSettingsPage = lazyWithPreload(() =>
  import("@/features/iam/system-settings/page").then((m) => ({
    default: m.SystemSettingsPage,
  }))
)
const TenantsPage = lazyWithPreload(() =>
  import("@/features/iam/tenants/page").then((m) => ({ default: m.TenantsPage }))
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
