import { createContext, useContext } from "react"
import type { AssistantRuntime } from "@assistant-ui/react"
import type { OlorinConversation } from "./conversations"

export type OlorinContextValue = {
  threadId: string
  newThread: () => void
  switchToThread: (threadId: string) => Promise<void> | void
  runtime: AssistantRuntime
  conversations: {
    list: OlorinConversation[]
    loading: boolean
    error: string
    refresh: () => Promise<void>
  }
}

export const OlorinContext = createContext<OlorinContextValue | null>(null)

export function useOlorinContext(): OlorinContextValue {
  const ctx = useContext(OlorinContext)
  if (!ctx) {
    throw new Error("useOlorinContext must be used within an OlorinProvider")
  }
  return ctx
}
