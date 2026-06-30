import { I18nProvider } from "@workspace/i18n"
import { ThemeProvider } from "@workspace/theme"
import { NuqsAdapter } from "nuqs/adapters/react"
import { AuditPage, PermissionsPage, RolesPage, UsersPage } from "@/features/iam"

function getPathname() {
  if (typeof window === "undefined") return "/admin/users"
  return window.location.pathname
}

export default function Routes() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <NuqsAdapter>
          <IamRoutes />
        </NuqsAdapter>
      </ThemeProvider>
    </I18nProvider>
  )
}

function IamRoutes() {
  const pathname = getPathname()

  if (pathname.startsWith("/admin/roles")) return <RolesPage />
  if (pathname.startsWith("/admin/permissions")) return <PermissionsPage />
  if (pathname.startsWith("/admin/audit")) return <AuditPage />

  return <UsersPage />
}
