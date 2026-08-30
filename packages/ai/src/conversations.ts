import { useCallback, useEffect, useState } from "react"
import { api, ApiClientError, type ApiSuccess } from "@workspace/api"
import { apiUrl } from "@workspace/api/url"

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
    let cancelled = false
    api
      .get<ApiSuccess<OlorinConversation[]>>("/api/ai/conversations?limit=20")
      .then((response) => {
        if (!cancelled) setConversations(response.result ?? [])
      })
      .catch(() => {
        if (!cancelled) setError("error")
      })
    return () => {
      cancelled = true
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

export async function fetchConversationMessages(
  threadId: string
): Promise<OlorinConversationMessage[]> {
  const response = await api.get<ApiSuccess<OlorinConversationMessage[]>>(
    `/api/ai/conversations/${encodeURIComponent(threadId)}/messages?limit=200`
  )
  return response.result ?? []
}

// fetchApprovedExecutionResponse posts the execution request and returns the
// raw Response: resume-capable backends answer with an SSE stream that the
// caller feeds into runtime.thread.resumeRun({ stream }), older ones with a
// JSON envelope.
export async function fetchApprovedExecutionResponse(
  approvalId: string
): Promise<Response> {
  return fetch(
    apiUrl(`/api/ai/approvals/${encodeURIComponent(approvalId)}/execution`),
    {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json, text/event-stream" },
    }
  )
}

export async function deleteConversation(threadId: string): Promise<void> {
  await api.delete(
    `/api/ai/conversations/${encodeURIComponent(threadId)}`
  )
}
