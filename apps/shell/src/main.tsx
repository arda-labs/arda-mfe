import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { I18nProvider } from "@workspace/i18n"
import { ThemeProvider } from "@workspace/theme"
import { NuqsAdapter } from "nuqs/adapters/react"
import "@workspace/ui/globals.css"
import { App } from "./App.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <NuqsAdapter>
          <App />
        </NuqsAdapter>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>
)
