import { createAppLocaleLoader } from "@workspace/i18n"
import { QueryProvider } from "@workspace/query/provider"
import { createRemoteRoutes, lazyWithPreload } from "@workspace/ui/lib/lazy"

const locales = createAppLocaleLoader("mdm", {
  "vi-VN": () => import("../locales/vi-VN.json"),
  "en-US": () => import("../locales/en-US.json"),
})
const MdmPage = lazyWithPreload(() => import("@/features/mdm/page").then((m) => ({ default: m.MdmPage })))
const InterestRatesPage = lazyWithPreload(() => import("@/features/interest-rates/page").then((m) => ({ default: m.InterestRatesPage })))

export default createRemoteRoutes({
  locales, wrapper: QueryProvider, defaultComponent: MdmPage,
  defaultPrefixes: ["/admin/mdm"],
  routes: [{ prefix: "/admin/mdm/interest-rates", component: InterestRatesPage }],
})
