import { useCallback } from "react"
import { useOlorinContext } from "./context"

export const OLORIN_AGENT_ID = "arda-assistant"

export type ArdaToolHint = {
  name: string
  version?: number
  arguments: Record<string, unknown>
}

export function useOlorin() {
  const { threadId, newThread, switchToThread, runtime } = useOlorinContext()

  const send = useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      if (!trimmed) return
      runtime.thread?.append({
        role: "user",
        content: [{ type: "text", text: trimmed }],
      })
    },
    [runtime]
  )

  const isRunning = Boolean(runtime.thread?.getState()?.isRunning)

  return {
    threadId,
    newThread,
    switchToThread,
    send,
    isReady: true,
    isRunning,
  }
}
