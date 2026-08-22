import "@workspace/auth/api-bridge"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import { I18nProvider } from "@workspace/i18n"
import { ThemeProvider } from "@workspace/theme"
import "@workspace/ui/globals.css"
import RemoteRoutes from "./Routes"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <BrowserRouter>
          <RemoteRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>
)
