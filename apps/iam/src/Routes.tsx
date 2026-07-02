import { AuditPage, PermissionsPage, RolesPage, UsersPage } from "@/features/iam"
import { SystemSettingsPage } from "@/features/iam/system-settings/page"

function getPathname() {
  if (typeof window === "undefined") return "/admin/users"
  return window.location.pathname
}

export default function Routes() {
  return <IamRoutes />
}

function IamRoutes() {
  const pathname = getPathname()

  if (pathname.startsWith("/admin/roles")) return <RolesPage />
  if (pathname.startsWith("/admin/permissions")) return <PermissionsPage />
  if (pathname.startsWith("/admin/audit")) return <AuditPage />
  if (pathname.startsWith("/admin/settings")) return <SystemSettingsPage />

  return <UsersPage />
}
