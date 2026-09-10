import { registerAppLocales } from "@workspace/i18n"
import { QueryProvider } from "@workspace/query/provider"
import { createRemoteRoutes, lazyWithPreload } from "@workspace/ui/lib/lazy"
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

export default createRemoteRoutes({
  routes: [
    { prefix: "/capital/fund-types", component: FundTypesPage },
    { prefix: "/capital/products", component: ProductsPage },
    { prefix: "/capital/contracts/", component: ContractDetailPage },
  ],
  defaultComponent: ContractsPage,
  wrapper: QueryProvider,
})
