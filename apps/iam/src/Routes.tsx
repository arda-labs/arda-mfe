import "@workspace/i18n/apps/iam"
import { lazy, Suspense } from "react"
import { useLocation } from "react-router-dom"

const UsersPage = lazy(() =>
  import("@/features/iam/users/page").then((m) => ({ default: m.UsersPage }))
)
const GroupsPage = lazy(() =>
  import("@/features/iam/groups/page").then((m) => ({ default: m.GroupsPage }))
)
const RolesPage = lazy(() =>
  import("@/features/iam/roles/page").then((m) => ({ default: m.RolesPage }))
)
const PermissionsPage = lazy(() =>
  import("@/features/iam/permissions/page").then((m) => ({
    default: m.PermissionsPage,
  }))
)
const AuditPage = lazy(() =>
  import("@/features/iam/audit/page").then((m) => ({ default: m.AuditPage }))
)
const SystemSettingsPage = lazy(() =>
  import("@/features/iam/system-settings/page").then((m) => ({
    default: m.SystemSettingsPage,
  }))
)

export default function RemoteRoutes() {
  const { pathname } = useLocation()

  let page = <UsersPage />
  if (pathname.startsWith("/admin/groups")) page = <GroupsPage />
  if (pathname.startsWith("/admin/roles")) page = <RolesPage />
  if (pathname.startsWith("/admin/permissions")) page = <PermissionsPage />
  if (pathname.startsWith("/admin/audit")) page = <AuditPage />
  if (pathname.startsWith("/admin/settings")) page = <SystemSettingsPage />

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>{page}</Suspense>
    </div>
  )
}
