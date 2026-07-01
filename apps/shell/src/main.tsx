import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { I18nProvider } from "@workspace/i18n"
import { NuqsAdapter } from "nuqs/adapters/react"
import * as auth from "../../../packages/auth/src/index"
import * as notifications from "../../../packages/notifications/src/index"
import * as theme from "../../../packages/theme/src/index"
import "@workspace/ui/globals.css"
import { App } from "./App.tsx"

const mfCache = ((globalThis as typeof globalThis & {
  __mf_module_cache__?: {
    share: Record<string, unknown>
    remote: Record<string, unknown>
  }
}).__mf_module_cache__ ??= { share: {}, remote: {} })

// ponytail: Remove this when federation can eagerly expose workspace singletons.
mfCache.share["default:@workspace/auth"] ??= auth
mfCache.share["@workspace/auth"] ??= auth
mfCache.share["default:@workspace/notifications"] ??= notifications
mfCache.share["@workspace/notifications"] ??= notifications
mfCache.share["default:@workspace/theme"] ??= theme
mfCache.share["@workspace/theme"] ??= theme

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <theme.ThemeProvider>
        <auth.StepUpProvider>
          <NuqsAdapter>
            <App />
          </NuqsAdapter>
        </auth.StepUpProvider>
      </theme.ThemeProvider>
    </I18nProvider>
  </StrictMode>
)
