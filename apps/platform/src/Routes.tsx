import { lazy, Suspense } from "react"

const AreaTypesPage = lazy(() =>
  import("@/features/platform/area-types/page").then((m) => ({
    default: m.AreaTypesPage,
  }))
)
const AreasPage = lazy(() =>
  import("@/features/platform/areas/page").then((m) => ({ default: m.AreasPage }))
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
  import("@/features/platform/cutoff/page").then((m) => ({ default: m.CutoffPage }))
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
  import("@/features/platform/wards/page").then((m) => ({ default: m.WardsPage }))
)

function getPathname() {
  if (typeof window === "undefined") return "/admin/organizations"
  return window.location.pathname
}

export default function Routes() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>
        <PlatformRoutes />
      </Suspense>
    </div>
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
