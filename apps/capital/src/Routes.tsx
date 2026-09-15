import { createAppLocaleLoader } from "@workspace/i18n"
import { QueryProvider } from "@workspace/query/provider"
import { createRemoteRoutes, lazyWithPreload } from "@workspace/ui/lib/lazy"
const locales = createAppLocaleLoader("capital", {
  "vi-VN": () => import("../locales/vi-VN.json"),
  "en-US": () => import("../locales/en-US.json"),
})

const ContractsPage = lazyWithPreload(() =>
  import("@/features/contracts/page").then((m) => ({
    default: m.ContractsPage,
  }))
)

const ContractDetailPage = lazyWithPreload(() =>
  import("@/features/contracts/detail-page").then((m) => ({
    default: m.ContractDetailPage,
  }))
)

const FundTypesPage = lazyWithPreload(() =>
  import("@/features/catalogs/fund-types/page").then((m) => ({
    default: m.FundTypesPage,
  }))
)

const ProductsPage = lazyWithPreload(() =>
  import("@/features/catalogs/products/page").then((m) => ({
    default: m.ProductsPage,
  }))
)

const ReportsPage = lazyWithPreload(() =>
  import("@/features/reports/page").then((m) => ({
    default: m.ReportsPage,
  }))
)

export default createRemoteRoutes({
  locales,
  defaultPrefixes: ["/capital"],
  routes: [
    { prefix: "/capital/fund-types", component: FundTypesPage },
    { prefix: "/capital/products", component: ProductsPage },
    { prefix: "/capital/reports", component: ReportsPage },
    { prefix: "/capital/contracts/", component: ContractDetailPage },
  ],
  defaultComponent: ContractsPage,
  wrapper: QueryProvider,
})
