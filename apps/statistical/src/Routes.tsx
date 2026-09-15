import { createAppLocaleLoader } from "@workspace/i18n"
import { QueryProvider } from "@workspace/query/provider"
import { createRemoteRoutes, lazyWithPreload } from "@workspace/ui/lib/lazy"

const locales = createAppLocaleLoader("statistical", {
  "vi-VN": () => import("../locales/vi-VN.json"),
  "en-US": () => import("../locales/en-US.json"),
})
const ReportDefinitionsPage = lazyWithPreload(() => import("@/features/report-definitions/page").then((m) => ({ default: m.ReportDefinitionsPage })))
const IndicatorsPage = lazyWithPreload(() => import("@/features/indicators/page").then((m) => ({ default: m.IndicatorsPage })))
const SubmissionsPage = lazyWithPreload(() => import("@/features/submissions/page").then((m) => ({ default: m.SubmissionsPage })))
const ReportsPage = lazyWithPreload(() => import("@/features/reports/page").then((m) => ({ default: m.ReportsPage })))
const CatalogsPage = lazyWithPreload(() => import("@/features/catalogs/page").then((m) => ({ default: m.CatalogsPage })))
const FormsPage = lazyWithPreload(() => import("@/features/forms/page").then((m) => ({ default: m.FormsPage })))
const DashboardPage = lazyWithPreload(() => import("@/features/dashboard/page").then((m) => ({ default: m.DashboardPage })))
const ScoringPage = lazyWithPreload(() => import("@/features/scoring/page").then((m) => ({ default: m.ScoringPage })))
const ImportPage = lazyWithPreload(() => import("@/features/import/page").then((m) => ({ default: m.ImportPage })))
const CmmsPage = lazyWithPreload(() => import("@/features/cmms/page").then((m) => ({ default: m.CmmsPage })))

export default createRemoteRoutes({
  locales, wrapper: QueryProvider, defaultComponent: ReportDefinitionsPage,
  defaultPrefixes: ["/statistical"],
  routes: [
    { prefix: "/statistical/indicators", component: IndicatorsPage },
    { prefix: "/statistical/submissions", component: SubmissionsPage },
    { prefix: "/statistical/reports", component: ReportsPage },
    { prefix: "/statistical/catalogs", component: CatalogsPage },
    { prefix: "/statistical/forms", component: FormsPage },
    { prefix: "/statistical/scoring", component: ScoringPage },
    { prefix: "/statistical/import", component: ImportPage },
    { prefix: "/statistical/cmms", component: CmmsPage },
    { prefix: "/statistical/dashboard", component: DashboardPage },
  ],
})
