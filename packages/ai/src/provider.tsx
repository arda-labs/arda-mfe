import type { ReactNode } from "react"
import { CopilotKitProvider } from "@copilotkit/react-core/v2"
import { apiUrl } from "@workspace/api/url"
import "@workspace/i18n/apps/ai"

export type OlorinProviderProps = {
  children: ReactNode
  runtimeUrl?: string
}

export function OlorinProvider({ children, runtimeUrl }: OlorinProviderProps) {
  const resolved = runtimeUrl ?? apiUrl("/api/copilotkit")
  const crossOrigin = /^https?:\/\//i.test(resolved)
  return (
    <CopilotKitProvider
      runtimeUrl={resolved}
      useSingleEndpoint
      credentials={crossOrigin ? "include" : undefined}
    >
      {children}
    </CopilotKitProvider>
  )
}
