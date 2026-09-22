import { createAppLocaleLoader } from "@workspace/i18n"
import { QueryProvider } from "@workspace/query/provider"
import { createRemoteRoutes, lazyWithPreload } from "@workspace/ui/lib/lazy"

const locales = createAppLocaleLoader("crm", {
  "vi-VN": () => import("../locales/vi-VN.json"),
  "en-US": () => import("../locales/en-US.json"),
})
const CustomersPage = lazyWithPreload(() => import("@/features/customers/page").then((m) => ({ default: m.CustomersPage })))
const ReportsPage = lazyWithPreload(() => import("@/features/reports/page").then((m) => ({ default: m.ReportsPage })))
const ProjectsPage = lazyWithPreload(() => import("@/features/projects/page").then((m) => ({ default: m.ProjectsPage })))
const MembersPage = lazyWithPreload(() => import("@/features/members/page").then((m) => ({ default: m.MembersPage })))

export default createRemoteRoutes({
  locales, wrapper: QueryProvider, defaultComponent: CustomersPage,
  defaultPrefixes: ["/customers"],
  routes: [
    { prefix: "/customers/reports", component: ReportsPage },
    { prefix: "/customers/projects", component: ProjectsPage },
    { prefix: "/customers/members", component: MembersPage },
  ],
})
