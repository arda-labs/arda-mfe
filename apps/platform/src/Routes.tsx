import { I18nProvider } from "@workspace/i18n"
import { ThemeProvider } from "@workspace/theme"
import { NuqsAdapter } from "nuqs/adapters/react"
import {
  AreaTypesPage,
  AreasPage,
  CalendarPage,
  CreditInstitutionsPage,
  CutoffPage,
  LookupsPage,
  OrganizationsPage,
  ParametersPage,
  ProvincesPage,
  TemplatesPage,
  WardsPage,
} from "@/features/platform"

function getPathname() {
  if (typeof window === "undefined") return "/admin/organizations"
  return window.location.pathname
}

export default function Routes() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <NuqsAdapter>
          <PlatformRoutes />
        </NuqsAdapter>
      </ThemeProvider>
    </I18nProvider>
  )
}

function PlatformRoutes() {
  const pathname = getPathname()

  if (pathname.startsWith("/admin/parameters")) return <ParametersPage />
  if (pathname.startsWith("/admin/provinces")) return <ProvincesPage />
  if (pathname.startsWith("/admin/wards")) return <WardsPage />
  if (pathname.startsWith("/admin/lookups")) return <LookupsPage />
  if (pathname.startsWith("/admin/area-types")) return <AreaTypesPage />
  if (pathname.startsWith("/admin/areas")) return <AreasPage />
  if (pathname.startsWith("/admin/credit-institutions")) return <CreditInstitutionsPage />
  if (pathname.startsWith("/admin/templates")) return <TemplatesPage />
  if (pathname.startsWith("/admin/calendar")) return <CalendarPage />
  if (pathname.startsWith("/admin/cutoff")) return <CutoffPage />

  return <OrganizationsPage />
}
