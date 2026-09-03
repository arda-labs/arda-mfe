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

export default createRemoteRoutes({
  routes: [
    { prefix: "/ai/admin/knowledge", component: KnowledgePage },
    { prefix: "/ai/admin/settings", component: SettingsPage },
  ],
  defaultComponent: KnowledgePage,
  wrapper: QueryProvider,
})
