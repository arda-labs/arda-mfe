import "@workspace/i18n/apps/platform"
import { Suspense } from "react"
import { useLocation } from "react-router-dom"
import { QueryProvider } from "@workspace/query/provider"
import { attachPreload, lazyWithPreload } from "@workspace/ui/lib/lazy"

const AreaTypesPage = lazyWithPreload(() =>
  import("@/features/platform/area-types/page").then((m) => ({
    default: m.AreaTypesPage,
  }))
)
const AreasPage = lazyWithPreload(() =>
  import("@/features/platform/areas/page").then((m) => ({
    default: m.AreasPage,
  }))
)
const CalendarPage = lazyWithPreload(() =>
  import("@/features/platform/calendar/page").then((m) => ({
    default: m.CalendarPage,
  }))
)
const CreditInstitutionsPage = lazyWithPreload(() =>
  import("@/features/platform/credit-institutions/page").then((m) => ({
    default: m.CreditInstitutionsPage,
  }))
)
const CutoffPage = lazyWithPreload(() =>
  import("@/features/platform/cutoff/page").then((m) => ({
    default: m.CutoffPage,
  }))
)
const LookupsPage = lazyWithPreload(() =>
  import("@/features/platform/lookups/page").then((m) => ({
    default: m.LookupsPage,
  }))
)
const OrganizationsPage = lazyWithPreload(() =>
  import("@/features/platform/organizations/page").then((m) => ({
    default: m.OrganizationsPage,
  }))
)
const ParametersPage = lazyWithPreload(() =>
  import("@/features/platform/parameters/page").then((m) => ({
    default: m.ParametersPage,
  }))
)
const ProvincesPage = lazyWithPreload(() =>
  import("@/features/platform/provinces/page").then((m) => ({
    default: m.ProvincesPage,
  }))
)
const TemplatesPage = lazyWithPreload(() =>
  import("@/features/platform/templates/page").then((m) => ({
    default: m.TemplatesPage,
  }))
)
const WardsPage = lazyWithPreload(() =>
  import("@/features/platform/wards/page").then((m) => ({
    default: m.WardsPage,
  }))
)

async function preload(pathname = "") {
  let page = OrganizationsPage
  if (pathname.startsWith("/admin/parameters")) page = ParametersPage
  if (pathname.startsWith("/admin/provinces")) page = ProvincesPage
  if (pathname.startsWith("/admin/wards")) page = WardsPage
  if (pathname.startsWith("/admin/lookups")) page = LookupsPage
  if (pathname.startsWith("/admin/area-types")) page = AreaTypesPage
  if (pathname.startsWith("/admin/areas")) page = AreasPage
  if (pathname.startsWith("/admin/credit-institutions"))
    page = CreditInstitutionsPage
  if (pathname.startsWith("/admin/templates")) page = TemplatesPage
  if (pathname.startsWith("/admin/calendar")) page = CalendarPage
  if (pathname.startsWith("/admin/cutoff")) page = CutoffPage
  await page.preload()
}

function RemoteRoutes() {
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

const RemoteRoutesWithPreload = attachPreload(RemoteRoutes, preload)

export default RemoteRoutesWithPreload
