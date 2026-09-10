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
const InterbankDetailPage = lazyWithPreload(() =>
  import("@/features/interbank/detail-page").then((m) => ({
    default: m.InterbankDetailPage,
  }))
)
const IbmProductsPage = lazyWithPreload(() =>
  import("@/features/interbank/ibm-products-page").then((m) => ({
    default: m.IbmProductsPage,
  }))
)
const RatesPage = lazyWithPreload(() =>
  import("@/features/rates/page").then((m) => ({
    default: m.RatesPage,
  }))
)
const SavingsDetailPage = lazyWithPreload(() =>
  import("@/features/savings/detail-page").then((m) => ({
    default: m.SavingsDetailPage,
  }))
)
const BatchInterestPage = lazyWithPreload(() =>
  import("@/features/batch-interest/page").then((m) => ({
    default: m.BatchInterestPage,
  }))
)

async function preload(pathname: string) {
  if (pathname.startsWith("/deposit/products")) await ProductsPage.preload()
  else if (pathname.startsWith("/deposit/rates")) await RatesPage.preload()
  else if (pathname.startsWith("/deposit/batch-interest")) await BatchInterestPage.preload()
  else if (pathname.startsWith("/deposit/savings/")) await SavingsDetailPage.preload()
  else if (pathname.startsWith("/deposit/interbank/products")) await IbmProductsPage.preload()
  else if (pathname.startsWith("/deposit/interbank/")) await InterbankDetailPage.preload()
  else if (pathname.startsWith("/deposit/interbank")) await InterbankPage.preload()
  else await SavingsPage.preload()
}

function RemoteRoutes() {
  const { pathname } = useLocation()

  let page = <SavingsPage pathname={pathname} />
  if (pathname.startsWith("/deposit/products")) page = <ProductsPage pathname={pathname} />
  else if (pathname.startsWith("/deposit/rates")) page = <RatesPage />
  else if (pathname.startsWith("/deposit/batch-interest")) page = <BatchInterestPage />
  else if (pathname.startsWith("/deposit/savings/")) page = <SavingsDetailPage />
  else if (pathname.startsWith("/deposit/interbank/products")) page = <IbmProductsPage />
  else if (pathname.startsWith("/deposit/interbank/")) page = <InterbankDetailPage />
  else if (pathname.startsWith("/deposit/interbank"))
    page = <InterbankPage pathname={pathname} />

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>
        <QueryProvider>{page}</QueryProvider>
      </Suspense>
    </div>
  )
}

export default Object.assign(RemoteRoutes, { preload })
