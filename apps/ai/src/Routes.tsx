import { createAppLocaleLoader } from "@workspace/i18n"
const locales = createAppLocaleLoader("ai", {
  "vi-VN": () => import("../locales/vi-VN.json"),
  "en-US": () => import("../locales/en-US.json"),
})

import { QueryProvider } from "@workspace/query/provider"
import { createRemoteRoutes, lazyWithPreload } from "@workspace/ui/lib/lazy"

const KnowledgePage = lazyWithPreload(() =>
  import("@/features/knowledge/page").then((m) => ({ default: m.KnowledgePage }))
)
const SettingsPage = lazyWithPreload(() =>
  import("@/features/settings/page").then((m) => ({ default: m.SettingsPage }))
)
const ApprovalsPage = lazyWithPreload(() =>
  import("@/features/approvals/page").then((m) => ({ default: m.ApprovalsPage }))
)
const ToolsPage = lazyWithPreload(() =>
  import("@/features/tools/page").then((m) => ({ default: m.ToolsPage }))
)
const AnalyticsPage = lazyWithPreload(() =>
  import("@/features/analytics/page").then((m) => ({ default: m.AnalyticsPage }))
)

export default createRemoteRoutes({
  locales,
  defaultPrefixes: [],
  routes: [
    { prefix: "/ai/knowledge", component: KnowledgePage },
    { prefix: "/ai/settings", component: SettingsPage },
    { prefix: "/ai/approvals", component: ApprovalsPage },
    { prefix: "/ai/tools", component: ToolsPage },
    { prefix: "/ai/analytics", component: AnalyticsPage },
  ],
  defaultComponent: KnowledgePage,
  wrapper: QueryProvider,
})
