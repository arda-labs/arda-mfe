import { Suspense } from "react"
import { useLocation } from "react-router-dom"
import { registerAppLocales } from "@workspace/i18n"
import { QueryProvider } from "@workspace/query/provider"
import { lazyWithPreload } from "@workspace/ui/lib/lazy"
import enCapital from "../locales/en-US.json"
import viCapital from "../locales/vi-VN.json"

registerAppLocales("capital", {
  "vi-VN": viCapital,
  "en-US": enCapital,
})

const ContractsPage = lazyWithPreload(() =>
  import("@/features/contracts/page").then((m) => ({
    default: m.ContractsPage,
  }))
)

async function preload(_pathname?: string) {
  await ContractsPage.preload()
}

function RemoteRoutes() {
  const { pathname } = useLocation()

  let page = <ContractsPage pathname={pathname} />

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>
        <QueryProvider>{page}</QueryProvider>
      </Suspense>
    </div>
  )
}

export default Object.assign(RemoteRoutes, { preload })
