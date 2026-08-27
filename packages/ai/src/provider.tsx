import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ThreadMessage,
} from "@assistant-ui/react"
import { registerAppLocales } from "@workspace/i18n"
import enAi from "../locales/en-US.json"
import viAi from "../locales/vi-VN.json"

registerAppLocales("ai", {
  "vi-VN": viAi,
  "en-US": enAi,
})

import { createArdaChatModelAdapter } from "./adapter"
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

  const adapter = useMemo(
    () =>
      createArdaChatModelAdapter({
        getThreadId: () => threadId,
        endpoint: runtimeUrl,
      }),
    [threadId, runtimeUrl]
  )

  const runtime = useLocalRuntime(adapter)

  const newThread = useCallback(() => {
    const nextId = crypto.randomUUID()
    setThreadId(nextId)
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
