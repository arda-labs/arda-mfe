import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { ArdaQueryProvider } from "@workspace/core/query"
import { I18nProvider } from "@workspace/i18n"
import { NuqsAdapter } from "nuqs/adapters/react"
import { ThemeProvider } from "../../../packages/theme/src/index"
import "@workspace/ui/globals.css"
import { App } from "./App.tsx"

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
