import { registerAppLocales } from "@workspace/i18n"
import enPlatform from "../locales/en-US.json"
import viPlatform from "../locales/vi-VN.json"

registerAppLocales("platform", {
  "vi-VN": viPlatform,
  "en-US": enPlatform,
})
import { QueryProvider } from "@workspace/query/provider"
import { createRemoteRoutes, lazyWithPreload } from "@workspace/ui/lib/lazy"

const AreaTypesPage = lazyWithPreload(() =>
  import("@/features/area-types/page").then((m) => ({
    default: m.AreaTypesPage,
  }))
)
const AreasPage = lazyWithPreload(() =>
  import("@/features/areas/page").then((m) => ({
    default: m.AreasPage,
  }))
)
const CalendarPage = lazyWithPreload(() =>
  import("@/features/calendar/page").then((m) => ({
    default: m.CalendarPage,
  }))
)
const CreditInstitutionsPage = lazyWithPreload(() =>
  import("@/features/credit-institutions/page").then((m) => ({
    default: m.CreditInstitutionsPage,
  }))
)
const CutoffPage = lazyWithPreload(() =>
  import("@/features/cutoff/page").then((m) => ({
    default: m.CutoffPage,
  }))
)
const LookupsPage = lazyWithPreload(() =>
  import("@/features/lookups/page").then((m) => ({
    default: m.LookupsPage,
  }))
)
const MenusPage = lazyWithPreload(() =>
  import("@/features/menus/page").then((m) => ({
    default: m.MenusPage,
  }))
)
const OrganizationsPage = lazyWithPreload(() =>
  import("@/features/organizations/page").then((m) => ({
    default: m.OrganizationsPage,
  }))
)
const ParametersPage = lazyWithPreload(() =>
  import("@/features/parameters/page").then((m) => ({
    default: m.ParametersPage,
  }))
)
const ProvincesPage = lazyWithPreload(() =>
  import("@/features/provinces/page").then((m) => ({
    default: m.ProvincesPage,
  }))
)
const TemplatesPage = lazyWithPreload(() =>
  import("@/features/templates/page").then((m) => ({
    default: m.TemplatesPage,
  }))
)
const WardsPage = lazyWithPreload(() =>
  import("@/features/wards/page").then((m) => ({
    default: m.WardsPage,
  }))
)

export default createRemoteRoutes({
  routes: [
    { prefix: "/admin/parameters", component: ParametersPage },
    { prefix: "/admin/provinces", component: ProvincesPage },
    { prefix: "/admin/wards", component: WardsPage },
    { prefix: "/admin/lookups", component: LookupsPage },
    { prefix: "/admin/area-types", component: AreaTypesPage },
    { prefix: "/admin/areas", component: AreasPage },
    { prefix: "/admin/credit-institutions", component: CreditInstitutionsPage },
    { prefix: "/admin/templates", component: TemplatesPage },
    { prefix: "/admin/calendar", component: CalendarPage },
    { prefix: "/admin/cutoff", component: CutoffPage },
    { prefix: "/admin/menus", component: MenusPage },
  ],
  defaultComponent: OrganizationsPage,
  wrapper: QueryProvider,
})
