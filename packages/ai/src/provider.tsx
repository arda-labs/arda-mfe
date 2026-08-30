import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  AssistantRuntimeProvider,
  type ThreadMessage,
} from "@assistant-ui/react"
import { useAgUiRuntime } from "@assistant-ui/react-ag-ui"
import { HttpAgent } from "@ag-ui/client"
import { apiUrl } from "@workspace/api/url"
import { registerAppLocales } from "@workspace/i18n"
import enAi from "../locales/en-US.json"
import viAi from "../locales/vi-VN.json"

registerAppLocales("ai", {
  "vi-VN": viAi,
  "en-US": enAi,
})

import { OlorinContext } from "./context"
import {
  fetchConversationMessages,
  type OlorinConversationMessage,
} from "./conversations"

export type OlorinProviderProps = {
  children: ReactNode
  runtimeUrl?: string
}

function toThreadMessage(
  item: OlorinConversationMessage,
  id: string
): ThreadMessage {
  const createdAt = item.createdAt ? new Date(item.createdAt) : new Date()

  if (item.role === "assistant") {
    return {
      id,
      role: "assistant" as const,
      createdAt,
      status: { type: "complete" as const, reason: "stop" as const },
      content: [{ type: "text" as const, text: item.content }],
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
    }
  }

  if (item.role === "system") {
    return {
      id,
      role: "system" as const,
      createdAt,
      content: [{ type: "text" as const, text: item.content }],
      metadata: { custom: {} },
    }
  }

  return {
    id,
    role: "user" as const,
    createdAt,
    attachments: [],
    content: [{ type: "text" as const, text: item.content }],
    metadata: { custom: {} },
  }
}

export function OlorinProvider({ children, runtimeUrl }: OlorinProviderProps) {
  const [threadId, setThreadId] = useState<string>(() => crypto.randomUUID())

  // The AG-UI runtime drives the whole chat (streaming, tool calls,
  // reasoning, HITL interrupts) against our Go agent endpoint speaking the
  // AG-UI SSE protocol — no hand-written adapter.
  const agent = useMemo(
    () =>
      new HttpAgent({
        url: runtimeUrl ?? apiUrl("/api/ai/agent"),
        // The gateway lives on a different origin (api.* vs *); HttpAgent's
        // default fetch does not attach cookies, so every run would return
        // 401. Forward the session cookie explicitly.
        fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
      }),
    [runtimeUrl]
  )

  const runtime = useAgUiRuntime({
    agent,
    adapters: {
      threadList: {
        onSwitchToThread: async (nextThreadId) => {
          const history = await fetchConversationMessages(nextThreadId)
          const messages = history.map((item) =>
            toThreadMessage(item, `hist-${nextThreadId}-${item.sequence}`)
          )
          return { messages }
        },
      },
    },
  })

  const newThread = useCallback(() => {
    setThreadId(crypto.randomUUID())
    runtime.thread?.import({ messages: [] })
  }, [runtime])

  const switchToThread = useCallback(
    async (nextThreadId: string) => {
      setThreadId(nextThreadId)
      try {
        const history = await fetchConversationMessages(nextThreadId)
        const formatted = history.map((item, index) => ({
          message: toThreadMessage(
            item,
            `hist-${nextThreadId}-${item.sequence}`
          ),
          parentId:
            index > 0
              ? `hist-${nextThreadId}-${history[index - 1].sequence}`
              : null,
        }))
        runtime.thread?.import({ messages: formatted })
      } catch (err) {
        console.warn("Failed to load thread history", err)
        runtime.thread?.import({ messages: [] })
      }
    },
    [runtime]
  )

  const value = useMemo(
    () => ({
      threadId,
      newThread,
      switchToThread,
      runtime,
    }),
    [threadId, newThread, switchToThread, runtime]
  )

  return (
    <OlorinContext.Provider value={value}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </OlorinContext.Provider>
  )
}
