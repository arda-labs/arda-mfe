import { useCallback } from "react"
import {
  UseAgentUpdate,
  useAgent,
} from "@copilotkit/react-core/v2"
import type { OlorinMessage } from "./messages"
import { collectOlorinContext } from "./registry"

export const OLORIN_AGENT_ID = "arda-assistant"

export type ArdaToolHint = {
  name: string
  version?: number
  arguments: Record<string, unknown>
}

export type UseOlorinResult = {
  messages: OlorinMessage[]
  isReady: boolean
  isRunning: boolean
  send: (content: string, toolHint?: ArdaToolHint) => Promise<void>
}

export function useOlorin(): UseOlorinResult {
  const { agent, isReady } = useAgent({
    agentId: OLORIN_AGENT_ID,
    updates: [UseAgentUpdate.OnMessagesChanged, UseAgentUpdate.OnRunStatusChanged],
  })

  const messages = ((agent.messages ?? []) as unknown as OlorinMessage[]).filter(
    (message) => message.role === "user" || message.role === "assistant" || message.role === "tool"
  )

  const send = useCallback(
    async (content: string, toolHint?: ArdaToolHint) => {
      const trimmed = content.trim()
      if (!trimmed) return
      const forwardedProps: Record<string, unknown> = {}
      const context = collectOlorinContext()
      if (Object.keys(context).length > 0) forwardedProps.ardaContext = context
      if (toolHint) forwardedProps.ardaTool = toolHint

      agent.addMessage({ id: crypto.randomUUID(), role: "user", content: trimmed })
      await agent.runAgent({
        runId: crypto.randomUUID(),
        ...(Object.keys(forwardedProps).length > 0 ? { forwardedProps } : {}),
      })
    },
    [agent]
  )

  return {
    messages,
    isReady,
    isRunning: Boolean(agent.isRunning),
    send,
  }
}
