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

export async function executeApprovedProposal(
  approvalId: string
): Promise<{ status: string; summary: string; resumedReply?: string }> {
  const response = await fetch(
    apiUrl(`/api/ai/approvals/${encodeURIComponent(approvalId)}/execution`),
    {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json, text/event-stream" },
    }
  )
  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`
    try {
      const body = (await response.json()) as Record<string, unknown>
      if (body?.detail || body?.title || body?.error) {
        errorMsg = String(body.detail || body.title || body.error)
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMsg)
  }

  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("text/event-stream")) {
    // Resume-capable backends stream the continued agent turn instead of a
    // JSON envelope. Only assistant text is surfaced here; further tool calls
    // inside the resumed turn are handled server-side and shown on reload.
    const reply = await consumeApprovalResumeStream(response.body!)
    return { status: "EXECUTED", summary: "", resumedReply: reply }
  }

  const payload = (await response.json()) as {
    result: { status: string; summary: string }
  }
  return payload.result
}

async function consumeApprovalResumeStream(
  body: ReadableStream<Uint8Array>
): Promise<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let text = ""
  let streamError: string | null = null

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith("data:")) continue
        const dataStr = trimmed.slice(5).trim()
        if (!dataStr) continue
        let event: Record<string, unknown>
        try {
          event = JSON.parse(dataStr) as Record<string, unknown>
        } catch {
          continue
        }
        // Legacy v1 events and AI SDK v2 parts both carry text in `delta`
        // under slightly different type names; error shapes differ.
        if (event.type === "TEXT_MESSAGE_CONTENT" || event.type === "text-delta") {
          text += String(event.delta ?? "")
        } else if (event.type === "RUN_FINISHED" && typeof event.error === "string") {
          streamError = event.error
        } else if (event.type === "error") {
          streamError = String(event.errorText ?? "ai.stream_error")
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  if (streamError) {
    throw new Error(streamError)
  }
  return text
}

export async function deleteConversation(threadId: string): Promise<void> {
  await api.delete(
    `/api/ai/conversations/${encodeURIComponent(threadId)}`
  )
}
