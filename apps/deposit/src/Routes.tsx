import { Suspense } from "react"
import { useLocation } from "react-router-dom"
import { registerAppLocales } from "@workspace/i18n"
import { QueryProvider } from "@workspace/query/provider"
import { lazyWithPreload } from "@workspace/ui/lib/lazy"
import enDeposit from "../locales/en-US.json"
import viDeposit from "../locales/vi-VN.json"

registerAppLocales("deposit", {
  "vi-VN": viDeposit,
  "en-US": enDeposit,
})

const SavingsPage = lazyWithPreload(() =>
  import("@/features/savings/page").then((m) => ({
    default: m.SavingsPage,
  }))
)
const ProductsPage = lazyWithPreload(() =>
  import("@/features/products/page").then((m) => ({
    default: m.ProductsPage,
  }))
)
const InterbankPage = lazyWithPreload(() =>
  import("@/features/interbank/page").then((m) => ({
    default: m.InterbankPage,
  }))
)

async function preload(pathname: string) {
  if (pathname.startsWith("/deposit/products")) await ProductsPage.preload()
  else if (pathname.startsWith("/deposit/interbank")) await InterbankPage.preload()
  else await SavingsPage.preload()
}

function RemoteRoutes() {
  const { pathname } = useLocation()

  let page = <SavingsPage pathname={pathname} />
  if (pathname.startsWith("/deposit/products")) page = <ProductsPage pathname={pathname} />
  else if (pathname.startsWith("/deposit/interbank")) page = <InterbankPage pathname={pathname} />

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>
        <QueryProvider>{page}</QueryProvider>
      </Suspense>
    </div>
  )
}

export default Object.assign(RemoteRoutes, { preload })
