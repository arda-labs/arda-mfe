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

async function preload(pathname: string) {
  if (pathname.startsWith("/statistical/indicators")) await IndicatorsPage.preload()
  else if (pathname.startsWith("/statistical/submissions")) await SubmissionsPage.preload()
  else await ReportDefinitionsPage.preload()
}

function RemoteRoutes() {
  const { pathname } = useLocation()

  let page = <ReportDefinitionsPage pathname={pathname} />
  if (pathname.startsWith("/statistical/indicators")) page = <IndicatorsPage pathname={pathname} />
  else if (pathname.startsWith("/statistical/submissions")) page = <SubmissionsPage pathname={pathname} />

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>
        <QueryProvider>{page}</QueryProvider>
      </Suspense>
    </div>
  )
}

export default Object.assign(RemoteRoutes, { preload })
