import { Suspense } from "react"
import { useLocation } from "react-router-dom"
import { registerAppLocales } from "@workspace/i18n"
import { QueryProvider } from "@workspace/query/provider"
import { lazyWithPreload } from "@workspace/ui/lib/lazy"
import enStatistical from "../locales/en-US.json"
import viStatistical from "../locales/vi-VN.json"

registerAppLocales("statistical", {
  "vi-VN": viStatistical,
  "en-US": enStatistical,
})

const ReportDefinitionsPage = lazyWithPreload(() =>
  import("@/features/report-definitions/page").then((m) => ({
    default: m.ReportDefinitionsPage,
  }))
)
const IndicatorsPage = lazyWithPreload(() =>
  import("@/features/indicators/page").then((m) => ({
    default: m.IndicatorsPage,
  }))
)
const SubmissionsPage = lazyWithPreload(() =>
  import("@/features/submissions/page").then((m) => ({
    default: m.SubmissionsPage,
  }))
)
const ReportsPage = lazyWithPreload(() =>
  import("@/features/reports/page").then((m) => ({
    default: m.ReportsPage,
  }))
)
const CatalogsPage = lazyWithPreload(() =>
  import("@/features/catalogs/page").then((m) => ({
    default: m.CatalogsPage,
  }))
)
const FormsPage = lazyWithPreload(() =>
  import("@/features/forms/page").then((m) => ({
    default: m.FormsPage,
  }))
)
const DashboardPage = lazyWithPreload(() =>
  import("@/features/dashboard/page").then((m) => ({
    default: m.DashboardPage,
  }))
)
const ScoringPage = lazyWithPreload(() =>
  import("@/features/scoring/page").then((m) => ({
    default: m.ScoringPage,
  }))
)
const ImportPage = lazyWithPreload(() =>
  import("@/features/import/page").then((m) => ({
    default: m.ImportPage,
  }))
)
const CmmsPage = lazyWithPreload(() =>
  import("@/features/cmms/page").then((m) => ({
    default: m.CmmsPage,
  }))
)

async function preload(pathname: string) {
  if (pathname.startsWith("/statistical/indicators")) await IndicatorsPage.preload()
  else if (pathname.startsWith("/statistical/submissions")) await SubmissionsPage.preload()
  else if (pathname.startsWith("/statistical/reports")) await ReportsPage.preload()
  else if (pathname.startsWith("/statistical/catalogs")) await CatalogsPage.preload()
  else if (pathname.startsWith("/statistical/forms")) await FormsPage.preload()
  else if (pathname.startsWith("/statistical/scoring")) await ScoringPage.preload()
  else if (pathname.startsWith("/statistical/import")) await ImportPage.preload()
  else if (pathname.startsWith("/statistical/cmms")) await CmmsPage.preload()
  else if (pathname.startsWith("/statistical/dashboard")) await DashboardPage.preload()
  else await ReportDefinitionsPage.preload()
}

function RemoteRoutes() {
  const { pathname } = useLocation()

  let page = <ReportDefinitionsPage pathname={pathname} />
  if (pathname.startsWith("/statistical/indicators")) page = <IndicatorsPage pathname={pathname} />
  else if (pathname.startsWith("/statistical/submissions")) page = <SubmissionsPage pathname={pathname} />
  else if (pathname.startsWith("/statistical/reports")) page = <ReportsPage />
  else if (pathname.startsWith("/statistical/catalogs")) page = <CatalogsPage />
  else if (pathname.startsWith("/statistical/forms")) page = <FormsPage />
  else if (pathname.startsWith("/statistical/scoring")) page = <ScoringPage />
  else if (pathname.startsWith("/statistical/import")) page = <ImportPage />
  else if (pathname.startsWith("/statistical/cmms")) page = <CmmsPage />
  else if (pathname.startsWith("/statistical/dashboard")) page = <DashboardPage />

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>
        <QueryProvider>{page}</QueryProvider>
      </Suspense>
    </div>
  )
}

export default Object.assign(RemoteRoutes, { preload })
