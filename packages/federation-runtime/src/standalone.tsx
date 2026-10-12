// Standalone dev harness for a remote: what apps/<remote>/index.html runs when
// the remote is opened on its own port instead of inside the shell. In
// federation mode the shell provides all of this and main.tsx never runs.
//
// api-bridge must be the first evaluated import so API calls made while the
// remote's modules initialise already have the auth handlers configured.
import "@workspace/auth/api-bridge"
import { StrictMode, type ComponentType } from "react"
import { createRoot, type Root } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import { I18nProvider } from "@workspace/i18n"
import { ThemeProvider } from "@workspace/theme"
import "@workspace/ui/globals.css"

export type CreateRemoteMainOptions = {
  /** Default export of the remote's ./Routes, the component the shell mounts. */
  Routes: ComponentType
  /** Mount node id from the remote's index.html. */
  rootId?: string
}

/** Mounts a remote's Routes with the providers the shell would supply. */
export function createRemoteMain({ Routes, rootId = "root" }: CreateRemoteMainOptions): Root {
  const root = createRoot(document.getElementById(rootId)!)
  root.render(
    <StrictMode>
      <I18nProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Routes />
          </BrowserRouter>
        </ThemeProvider>
      </I18nProvider>
    </StrictMode>
  )
  return root
}
