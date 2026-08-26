import type { ReactNode } from "react"
import { CopilotKitProvider } from "@copilotkit/react-core/v2"
import "@workspace/i18n/apps/ai"

export type OlorinProviderProps = {
  children: ReactNode
  runtimeUrl?: string
}

export function OlorinProvider({
  children,
  runtimeUrl = "/api/copilotkit",
}: OlorinProviderProps) {
  return (
    <CopilotKitProvider runtimeUrl={runtimeUrl} useSingleEndpoint>
      {children}
    </CopilotKitProvider>
  )
}
