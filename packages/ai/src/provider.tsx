import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
} from "@assistant-ui/react"
import "@workspace/i18n/apps/ai"
import { createArdaChatModelAdapter } from "./adapter"
import { OlorinContext } from "./context"

export type OlorinProviderProps = {
  children: ReactNode
  runtimeUrl?: string
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
    runtime.threads?.switchToNewThread()
  }, [runtime])

  const switchToThread = useCallback(
    (nextThreadId: string) => {
      setThreadId(nextThreadId)
      runtime.threads?.switchToThread(nextThreadId)
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
