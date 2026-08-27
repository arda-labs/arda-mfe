import { registerAppLocales } from "@workspace/i18n"
import enHrm from "../locales/en-US.json"
import viHrm from "../locales/vi-VN.json"

registerAppLocales("user", {
  "vi-VN": viHrm,
  "en-US": enHrm,
})
import { QueryProvider } from "@workspace/query/provider"
import { createRemoteRoutes, lazyWithPreload } from "@workspace/ui/lib/lazy"

const PositionsPage = lazyWithPreload(() =>
  import("@/features/positions/page").then((m) => ({
    default: m.PositionsPage,
  }))
)
const JobTitlesPage = lazyWithPreload(() =>
  import("@/features/job-titles/page").then((m) => ({
    default: m.JobTitlesPage,
  }))
)
const OrgUnitsPage = lazyWithPreload(() =>
  import("@/features/org-units/page").then((m) => ({
    default: m.OrgUnitsPage,
  }))
)
const RegistrationsPage = lazyWithPreload(() =>
  import("@/features/registrations/page").then((m) => ({
    default: m.RegistrationsPage,
  }))
)
const EmployeesPage = lazyWithPreload(() =>
  import("@/features/employees/page").then((m) => ({
    default: m.EmployeesPage,
  }))
)

export default createRemoteRoutes({
  routes: [
    { prefix: "/hrm/job-titles", component: JobTitlesPage },
    { prefix: "/hrm/org-units", component: OrgUnitsPage },
    { prefix: "/hrm/registrations", component: RegistrationsPage },
    { prefix: "/hrm/employees", component: EmployeesPage },
  ],
  defaultComponent: PositionsPage,
  wrapper: QueryProvider,
})
