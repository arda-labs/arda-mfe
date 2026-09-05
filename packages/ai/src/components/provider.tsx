import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  AssistantRuntimeProvider,
  WebSpeechDictationAdapter,
  type ExternalStoreThreadData,
  type ThreadMessage,
} from "@assistant-ui/react"
import { useAgUiRuntime } from "@assistant-ui/react-ag-ui"
import { HttpAgent } from "@ag-ui/client"
import { createCredentialedFetch } from "@workspace/api"
import { apiUrl } from "@workspace/api/url"
import { registerAppLocales } from "@workspace/i18n"
import enAi from "../../locales/en-US.json"
import viAi from "../../locales/vi-VN.json"

registerAppLocales("ai", {
  "vi-VN": viAi,
  "en-US": enAi,
})

import { OlorinContext } from "../lib/context"
import {
  deleteConversation,
  fetchConversationMessages,
  useOlorinConversations,
  type OlorinConversationMessage,
} from "../lib/conversations"

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
        fetch: createCredentialedFetch(),
      }),
    [runtimeUrl]
  )

  // Mirror threadId in a ref so adapter callbacks (which only depend on the
  // memoized deps below) can read the current thread without re-creating the
  // adapter on every switch. The agent follows the same id — centralized here
  // so no handler mutates it directly.
  const threadIdRef = useRef(threadId)
  const historyRequestRef = useRef(0)
  const historyAbortRef = useRef<AbortController | null>(null)
  useEffect(() => {
    threadIdRef.current = threadId
    agent.threadId = threadId
  }, [threadId, agent])

  // The runtime rebuilds its internal store whenever these option objects
  // change identity. Inline literals here would recreate them on every render
  // and drive React into "Maximum update depth exceeded" (#185) during fast
  // streams — memoize everything passed to useAgUiRuntime.
  const {
    conversations: conversationItems,
    loading: conversationsLoading,
    error: conversationsError,
    refresh: refreshConversations,
  } = useOlorinConversations(true)

  const threadListAdapter = useMemo(
    () => ({
      threads: conversationItems.map(
        (conversation): ExternalStoreThreadData<"regular"> => ({
          id: conversation.threadId,
          status: "regular",
          title: conversation.title || conversation.threadId,
          custom: {
            messageCount: conversation.messageCount,
            lastMessageAt: conversation.lastMessageAt,
            status: conversation.status,
          },
        })
      ),
      onSwitchToNewThread: () => {
        // The effect above keeps the agent's threadId in sync with state.
        setThreadId(crypto.randomUUID())
      },
      onSwitchToThread: async (nextThreadId: string) => {
        const requestId = ++historyRequestRef.current
        historyAbortRef.current?.abort()
        const controller = new AbortController()
        historyAbortRef.current = controller
        setThreadId(nextThreadId)
        const history = await fetchConversationMessages(nextThreadId, controller.signal)
        if (requestId !== historyRequestRef.current) return { messages: [] }
        const messages = history.map((item) =>
          toThreadMessage(item, `hist-${nextThreadId}-${item.sequence}`)
        )
        return { messages }
      },
      onDelete: async (deletedThreadId: string) => {
        if (threadIdRef.current === deletedThreadId) {
          // Deleted the currently active thread → start a new one so the
          // view doesn't show a dead conversation.
          setThreadId(crypto.randomUUID())
        }
        await deleteConversation(deletedThreadId)
        await refreshConversations()
      },
    }),
    [conversationItems, refreshConversations]
  )

  // Voice dictation uses the browser's Web Speech API — zero config, and
  // only mounted when the browser actually supports it (Chrome/Edge/Safari).
  const dictationAdapter = useMemo(
    () =>
      WebSpeechDictationAdapter.isSupported()
        ? new WebSpeechDictationAdapter({
            language: "vi-VN",
            continuous: true,
            interimResults: true,
          })
        : undefined,
    []
  )

  const runtimeOptions = useMemo(
    () => ({
      agent,
      adapters: {
        threadList: threadListAdapter,
        dictation: dictationAdapter,
      },
    }),
    [agent, threadListAdapter, dictationAdapter]
  )

  const runtime = useAgUiRuntime(runtimeOptions)

  const newThread = useCallback(() => {
    // The effect above keeps the agent's threadId in sync with state.
    setThreadId(crypto.randomUUID())
    runtime.thread?.import({ messages: [] })
  }, [runtime])

  const switchToThread = useCallback(
    async (nextThreadId: string) => {
      const requestId = ++historyRequestRef.current
      historyAbortRef.current?.abort()
      const controller = new AbortController()
      historyAbortRef.current = controller
      setThreadId(nextThreadId)
      try {
        const history = await fetchConversationMessages(nextThreadId, controller.signal)
        if (requestId !== historyRequestRef.current) return
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
        if (requestId !== historyRequestRef.current) return
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
      conversations: {
        list: conversationItems,
        loading: conversationsLoading,
        error: conversationsError,
        refresh: refreshConversations,
      },
    }),
    [
      threadId,
      newThread,
      switchToThread,
      runtime,
      conversationItems,
      conversationsLoading,
      conversationsError,
      refreshConversations,
    ]
  )

  return (
    <OlorinContext.Provider value={value}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </OlorinContext.Provider>
  )
}
