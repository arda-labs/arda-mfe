import { createAppLocaleLoader } from "@workspace/i18n"
import { QueryProvider } from "@workspace/query/provider"
import { createRemoteRoutes, lazyWithPreload } from "@workspace/ui/lib/lazy"

const locales = createAppLocaleLoader("deposit", {
  "vi-VN": () => import("../locales/vi-VN.json"),
  "en-US": () => import("../locales/en-US.json"),
})
const SavingsPage = lazyWithPreload(() => import("@/features/savings/page").then((m) => ({ default: m.SavingsPage })))
const ProductsPage = lazyWithPreload(() => import("@/features/products/page").then((m) => ({ default: m.ProductsPage })))
const InterbankPage = lazyWithPreload(() => import("@/features/interbank/page").then((m) => ({ default: m.InterbankPage })))
const InterbankDetailPage = lazyWithPreload(() => import("@/features/interbank/detail-page").then((m) => ({ default: m.InterbankDetailPage })))
const IbmProductsPage = lazyWithPreload(() => import("@/features/interbank/ibm-products-page").then((m) => ({ default: m.IbmProductsPage })))
const RatesPage = lazyWithPreload(() => import("@/features/rates/page").then((m) => ({ default: m.RatesPage })))
const SavingsDetailPage = lazyWithPreload(() => import("@/features/savings/detail-page").then((m) => ({ default: m.SavingsDetailPage })))
const BatchInterestPage = lazyWithPreload(() => import("@/features/batch-interest/page").then((m) => ({ default: m.BatchInterestPage })))
const ReportsPage = lazyWithPreload(() => import("@/features/reports/page").then((m) => ({ default: m.ReportsPage })))

export default createRemoteRoutes({
  locales, wrapper: QueryProvider, defaultComponent: SavingsPage,
  defaultPrefixes: ["/deposit"],
  routes: [
    { prefix: "/deposit/products", component: ProductsPage },
    { prefix: "/deposit/rates", component: RatesPage },
    { prefix: "/deposit/reports", component: ReportsPage },
    { prefix: "/deposit/batch-interest", component: BatchInterestPage },
    { prefix: "/deposit/savings/", component: SavingsDetailPage },
    { prefix: "/deposit/interbank/products", component: IbmProductsPage },
    { prefix: "/deposit/interbank/", component: InterbankDetailPage },
    { prefix: "/deposit/interbank", exact: true, component: InterbankPage },
  ],
})
