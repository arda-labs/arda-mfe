import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { ArdaQueryProvider } from "@workspace/core/query"
import { I18nProvider } from "@workspace/i18n"
import { ThemeProvider } from "@workspace/theme"
import "@workspace/ui/globals.css"
import Routes from "./Routes"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <ArdaQueryProvider>
        <ThemeProvider>
          <Routes />
        </ThemeProvider>
      </ArdaQueryProvider>
    </I18nProvider>
  </StrictMode>
)
