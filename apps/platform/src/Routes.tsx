import "@workspace/i18n/apps/platform"
import { lazy, Suspense } from "react"
import { useLocation } from "react-router-dom"
import { QueryProvider } from "@workspace/query/provider"

const AreaTypesPage = lazy(() =>
  import("@/features/platform/area-types/page").then((m) => ({
    default: m.AreaTypesPage,
  }))
)
const AreasPage = lazy(() =>
  import("@/features/platform/areas/page").then((m) => ({
    default: m.AreasPage,
  }))
)
const CalendarPage = lazy(() =>
  import("@/features/platform/calendar/page").then((m) => ({
    default: m.CalendarPage,
  }))
)
const CreditInstitutionsPage = lazy(() =>
  import("@/features/platform/credit-institutions/page").then((m) => ({
    default: m.CreditInstitutionsPage,
  }))
)
const CutoffPage = lazy(() =>
  import("@/features/platform/cutoff/page").then((m) => ({
    default: m.CutoffPage,
  }))
)
const LookupsPage = lazy(() =>
  import("@/features/platform/lookups/page").then((m) => ({
    default: m.LookupsPage,
  }))
)
const OrganizationsPage = lazy(() =>
  import("@/features/platform/organizations/page").then((m) => ({
    default: m.OrganizationsPage,
  }))
)
const ParametersPage = lazy(() =>
  import("@/features/platform/parameters/page").then((m) => ({
    default: m.ParametersPage,
  }))
)
const ProvincesPage = lazy(() =>
  import("@/features/platform/provinces/page").then((m) => ({
    default: m.ProvincesPage,
  }))
)
const TemplatesPage = lazy(() =>
  import("@/features/platform/templates/page").then((m) => ({
    default: m.TemplatesPage,
  }))
)
const WardsPage = lazy(() =>
  import("@/features/platform/wards/page").then((m) => ({
    default: m.WardsPage,
  }))
)

export default function RemoteRoutes() {
  const { pathname } = useLocation()

  let page = <OrganizationsPage />
  if (pathname.startsWith("/admin/parameters")) page = <ParametersPage />
  if (pathname.startsWith("/admin/provinces")) page = <ProvincesPage />
  if (pathname.startsWith("/admin/wards")) page = <WardsPage />
  if (pathname.startsWith("/admin/lookups")) page = <LookupsPage />
  if (pathname.startsWith("/admin/area-types")) page = <AreaTypesPage />
  if (pathname.startsWith("/admin/areas")) page = <AreasPage />
  if (pathname.startsWith("/admin/credit-institutions"))
    page = <CreditInstitutionsPage />
  if (pathname.startsWith("/admin/templates")) page = <TemplatesPage />
  if (pathname.startsWith("/admin/calendar")) page = <CalendarPage />
  if (pathname.startsWith("/admin/cutoff")) page = <CutoffPage />

  return (
    <QueryProvider>
      <div className="flex h-full min-h-0 flex-col">
        <Suspense fallback={null}>{page}</Suspense>
      </div>
    </QueryProvider>
  )
}
