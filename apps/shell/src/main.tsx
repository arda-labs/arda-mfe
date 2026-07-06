import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { ArdaQueryProvider } from "@workspace/core/query"
import { I18nProvider } from "@workspace/i18n"
import { NuqsAdapter } from "nuqs/adapters/react"
import * as notificationsShare from "../../../packages/notifications/src/index"
import { ThemeProvider } from "../../../packages/theme/src/index"
import "@workspace/ui/globals.css"
import { App } from "./App.tsx"

const mfCache = ((
  globalThis as typeof globalThis & {
    __mf_module_cache__?: {
      share: Record<string, unknown>
      remote: Record<string, unknown>
    }
  }
).__mf_module_cache__ ??= { share: {}, remote: {} })

// Eager seed: federation loadShare exports async when cache is cold (F5) →
// remotes calling notify() before share resolves get undefined toast helpers.
mfCache.share["default:@workspace/notifications"] ??= notificationsShare
mfCache.share["@workspace/notifications"] ??= notificationsShare

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <ArdaQueryProvider>
        <ThemeProvider>
          <NuqsAdapter>
            <App />
          </NuqsAdapter>
        </ThemeProvider>
      </ArdaQueryProvider>
    </I18nProvider>
  </StrictMode>
)
