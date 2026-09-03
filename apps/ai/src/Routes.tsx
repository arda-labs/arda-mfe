import { registerAppLocales } from "@workspace/i18n"
import en from "../locales/en-US.json"
import vi from "../locales/vi-VN.json"

registerAppLocales("ai", {
  "vi-VN": vi,
  "en-US": en,
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
const AgentsPage = lazyWithPreload(() =>
  import("@/features/agents/page").then((m) => ({ default: m.AgentsPage }))
)

export default createRemoteRoutes({
  routes: [
    { prefix: "/ai/knowledge", component: KnowledgePage },
    { prefix: "/ai/settings", component: SettingsPage },
    { prefix: "/ai/approvals", component: ApprovalsPage },
    { prefix: "/ai/tools", component: ToolsPage },
    { prefix: "/ai/analytics", component: AnalyticsPage },
    { prefix: "/ai/agents", component: AgentsPage },
  ],
  defaultComponent: KnowledgePage,
  wrapper: QueryProvider,
})
