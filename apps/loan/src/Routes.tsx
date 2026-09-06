import { Suspense } from "react"
import { useLocation } from "react-router-dom"
import { registerAppLocales } from "@workspace/i18n"
import { QueryProvider } from "@workspace/query/provider"
import { lazyWithPreload } from "@workspace/ui/lib/lazy"
import enLoan from "../locales/en-US.json"
import viLoan from "../locales/vi-VN.json"

registerAppLocales("loan", {
  "vi-VN": viLoan,
  "en-US": enLoan,
})

const LoanPage = lazyWithPreload(() =>
  import("@/features/loan/page").then((m) => ({
    default: m.LoanPage,
  }))
)
const ProductsPage = lazyWithPreload(() =>
  import("@/features/products/page").then((m) => ({
    default: m.ProductsPage,
  }))
)
const VfuPage = lazyWithPreload(() =>
  import("@/features/vfu/page").then((m) => ({
    default: m.VfuPage,
  }))
)

async function preload(pathname: string) {
  if (pathname.startsWith("/loans/products")) await ProductsPage.preload()
  else if (pathname.startsWith("/loans/vfu")) await VfuPage.preload()
  else await LoanPage.preload()
}

function RemoteRoutes() {
  const { pathname } = useLocation()

  let page = <LoanPage pathname={pathname} />
  if (pathname.startsWith("/loans/products")) page = <ProductsPage pathname={pathname} />
  else if (pathname.startsWith("/loans/vfu")) page = <VfuPage pathname={pathname} />

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>
        <QueryProvider>{page}</QueryProvider>
      </Suspense>
    </div>
  )
}

export default Object.assign(RemoteRoutes, { preload })
