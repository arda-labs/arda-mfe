import { useCallback, useEffect, useState } from "react"
import { api, ApiClientError, type ApiSuccess } from "@workspace/api"

export type OlorinConversation = {
  threadId: string
  title: string
  messageCount: number
  lastMessageAt?: string
  status: string
}

export type OlorinConversationMessage = {
  sequence: number
  role: string
  content: string
  createdAt: string
}

export function useOlorinConversations(enabled: boolean) {
  const [conversations, setConversations] = useState<OlorinConversation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setLoading(true)
    })
    api
      .get<ApiSuccess<OlorinConversation[]>>("/api/ai/conversations?limit=20", {
        signal: controller.signal,
      })
      .then((response) => {
        if (!cancelled) setConversations(response.result ?? [])
      })
      .catch((caught) => {
        if (!cancelled && !isAbortError(caught)) {
          setError(caught instanceof ApiClientError ? caught.code : "error")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [enabled])

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError("")
    try {
      const response = await api.get<ApiSuccess<OlorinConversation[]>>("/api/ai/conversations?limit=20")
      setConversations(response.result ?? [])
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.code : "error")
    } finally {
      setLoading(false)
    }
  }, [enabled])

  return { conversations, loading, error, refresh }
}

function isAbortError(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    (value as { name?: unknown }).name === "AbortError"
  )
}

export async function fetchConversationMessages(
  threadId: string,
  signal?: AbortSignal
): Promise<OlorinConversationMessage[]> {
  const response = await api.get<ApiSuccess<OlorinConversationMessage[]>>(
    `/api/ai/conversations/${encodeURIComponent(threadId)}/messages?limit=200`,
    { signal }
  )
  return response.result ?? []
}

export async function deleteConversation(threadId: string): Promise<void> {
  await api.delete(
    `/api/ai/conversations/${encodeURIComponent(threadId)}`
  )
}
