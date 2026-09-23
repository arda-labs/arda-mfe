import { createContext, useContext } from "react"
import type { AssistantRuntime } from "@assistant-ui/react"
import type { OlorinConversation } from "./conversations"

export type OlorinContextValue = {
  threadId: string
  newThread: () => void
  switchToThread: (threadId: string) => Promise<void> | void
  runtime: AssistantRuntime
  // Ask vs Act: in act mode the assistant may execute confirm tools at or below
  // the tenant's risk ceiling without an approval (server-enforced).
  actMode: boolean
  setActMode: (value: boolean) => void
  // AG-UI run id of the most recent run, used to attach answer feedback to the
  // exact assistant message. Null before the first run.
  getLastRunId: () => string | null
  // AG-UI run id of the run that produced one assistant message, so rating an
  // older answer never carries the newest run id. Null when unknown.
  getRunIdForMessage: (messageId: string | null) => string | null
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
