import "@workspace/i18n/apps/iam"
import { Suspense } from "react"
import { useLocation } from "react-router-dom"
import { attachPreload, lazyWithPreload } from "@workspace/ui/lib/lazy"

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

async function preload(pathname = "") {
  let page = UsersPage
  if (pathname.startsWith("/admin/groups")) page = GroupsPage
  if (pathname.startsWith("/admin/roles")) page = RolesPage
  if (pathname.startsWith("/admin/permissions")) page = PermissionsPage
  if (pathname.startsWith("/admin/audit")) page = AuditPage
  if (pathname.startsWith("/admin/settings")) page = SystemSettingsPage
  await page.preload()
}

function RemoteRoutes() {
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

const RemoteRoutesWithPreload = attachPreload(RemoteRoutes, preload)

export default RemoteRoutesWithPreload
