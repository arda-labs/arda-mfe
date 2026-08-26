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
  threadId: string
  messages: OlorinMessage[]
  isReady: boolean
  isRunning: boolean
  send: (content: string, toolHint?: ArdaToolHint) => Promise<void>
  newThread: () => void
  switchToThread: (threadId: string, history: Array<{ id: string; role: string; content: string }>) => void
}

type AgentLike = {
  threadId: string
  messages: unknown[]
  isRunning?: boolean
  addMessage: (message: { id: string; role: string; content: string }) => void
  setMessages: (messages: unknown[]) => void
  runAgent: (input: { runId: string; forwardedProps?: Record<string, unknown> }) => Promise<void>
}

// HttpAgent exposes threadId as a writable instance field (AG-UI contract);
// route the write through an opaque boundary so the React compiler does not
// treat the external library object as frozen state.
function assignThreadId(agent: unknown, threadId: string): void {
  ;(agent as { threadId: string }).threadId = threadId
}

export function useOlorin(): UseOlorinResult {
  const { agent, isReady } = useAgent({
    agentId: OLORIN_AGENT_ID,
    updates: [UseAgentUpdate.OnMessagesChanged, UseAgentUpdate.OnRunStatusChanged],
  })
  const olorinAgent = agent as unknown as AgentLike

  const messages = ((olorinAgent.messages ?? []) as unknown as OlorinMessage[]).filter(
    (message) => message.role === "user" || message.role === "assistant" || message.role === "tool"
  )

  const newThread = useCallback(() => {
    assignThreadId(olorinAgent, crypto.randomUUID())
    olorinAgent.setMessages([])
  }, [olorinAgent])

  const switchToThread = useCallback(
    (threadId: string, history: Array<{ id: string; role: string; content: string }>) => {
      assignThreadId(olorinAgent, threadId)
      olorinAgent.setMessages(history)
    },
    [olorinAgent]
  )

  const send = useCallback(
    async (content: string, toolHint?: ArdaToolHint) => {
      const trimmed = content.trim()
      if (!trimmed) return
      const forwardedProps: Record<string, unknown> = {}
      const context = collectOlorinContext()
      if (Object.keys(context).length > 0) forwardedProps.ardaContext = context
      if (toolHint) forwardedProps.ardaTool = toolHint

      olorinAgent.addMessage({ id: crypto.randomUUID(), role: "user", content: trimmed })
      await olorinAgent.runAgent({
        runId: crypto.randomUUID(),
        ...(Object.keys(forwardedProps).length > 0 ? { forwardedProps } : {}),
      })
    },
    [olorinAgent]
  )

  return {
    threadId: olorinAgent.threadId,
    messages,
    isReady,
    isRunning: Boolean(olorinAgent.isRunning),
    send,
    newThread,
    switchToThread,
  }
}
