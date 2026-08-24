import "@workspace/auth/api-bridge"
import "@workspace/i18n/apps/shell"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import { SystemBrandingProvider } from "@workspace/theme/branding"
import { I18nProvider } from "@workspace/i18n"
import { ThemeProvider } from "@workspace/theme"
import "@workspace/ui/globals.css"
import { App } from "./App.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SystemBrandingProvider>
      <I18nProvider>
        <ThemeProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ThemeProvider>
      </I18nProvider>
    </SystemBrandingProvider>
  </StrictMode>
)
