import "@workspace/i18n/apps/platform"
import { QueryProvider } from "@workspace/query/provider"
import { createRemoteRoutes, lazyWithPreload } from "@workspace/ui/lib/lazy"

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
const AISettingsPage = lazyWithPreload(() =>
  import("@/features/platform/ai-settings/page").then((m) => ({
    default: m.AISettingsPage,
  }))
)

export default createRemoteRoutes({
  routes: [
    { prefix: "/admin/ai-settings", component: AISettingsPage },
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
  ],
  defaultComponent: OrganizationsPage,
  wrapper: QueryProvider,
})
