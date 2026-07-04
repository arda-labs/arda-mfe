import { lazy, Suspense } from "react"

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

function getPathname() {
  if (typeof window === "undefined") return "/admin/users"
  return window.location.pathname
}

export default function Routes() {
  return (
    <div className="h-full min-h-0">
      <Suspense fallback={null}>
        <IamRoutes />
      </Suspense>
    </div>
  )
}

function IamRoutes() {
  const pathname = getPathname()

  if (pathname.startsWith("/admin/groups")) return <GroupsPage />
  if (pathname.startsWith("/admin/roles")) return <RolesPage />
  if (pathname.startsWith("/admin/permissions")) return <PermissionsPage />
  if (pathname.startsWith("/admin/audit")) return <AuditPage />
  if (pathname.startsWith("/admin/settings")) return <SystemSettingsPage />

  return <UsersPage />
}
