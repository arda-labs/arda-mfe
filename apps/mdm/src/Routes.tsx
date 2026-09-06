import { Suspense } from "react"
import { useLocation } from "react-router-dom"
import { registerAppLocales } from "@workspace/i18n"
import { QueryProvider } from "@workspace/query/provider"
import { lazyWithPreload } from "@workspace/ui/lib/lazy"
import enMdm from "../locales/en-US.json"
import viMdm from "../locales/vi-VN.json"

registerAppLocales("mdm", {
  "vi-VN": viMdm,
  "en-US": enMdm,
})

const MdmPage = lazyWithPreload(() =>
  import("@/features/mdm/page").then((m) => ({
    default: m.MdmPage,
  }))
)
const InterestRatesPage = lazyWithPreload(() =>
  import("@/features/interest-rates/page").then((m) => ({
    default: m.InterestRatesPage,
  }))
)

async function preload(pathname: string) {
  if (pathname.startsWith("/admin/mdm/interest-rates")) await InterestRatesPage.preload()
  else await MdmPage.preload()
}

function RemoteRoutes() {
  const { pathname } = useLocation()

  let page = <MdmPage pathname={pathname} />
  if (pathname.startsWith("/admin/mdm/interest-rates")) page = <InterestRatesPage pathname={pathname} />

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>
        <QueryProvider>{page}</QueryProvider>
      </Suspense>
    </div>
  )
}

export default Object.assign(RemoteRoutes, { preload })
