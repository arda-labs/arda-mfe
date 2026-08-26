import type { ChatModelAdapter, ChatModelRunUpdate } from "@assistant-ui/react"
import { apiUrl } from "@workspace/api/url"
import { collectOlorinContext } from "./registry"

export type ArdaSSEEvent =
  | { type: "RUN_STARTED"; threadId: string; runId: string }
  | { type: "TEXT_MESSAGE_START"; threadId: string; runId: string; messageId: string }
  | { type: "TEXT_MESSAGE_CONTENT"; threadId: string; runId: string; messageId: string; delta: string }
  | { type: "TEXT_MESSAGE_END"; threadId: string; runId: string; messageId: string }
  | { type: "TOOL_CALL_START"; threadId: string; runId: string; callId: string; toolName: string }
  | {
      type: "TOOL_CALL_RESULT"
      threadId: string
      runId: string
      callId: string
      toolName: string
      result: Record<string, unknown>
    }
  | { type: "RUN_FINISHED"; threadId: string; runId: string; error?: string }

export type ArdaChatModelAdapterOptions = {
  getThreadId: () => string
  endpoint?: string
}

type MessagePart = NonNullable<ChatModelRunUpdate["content"]>[number]

export function createArdaChatModelAdapter(
  options: ArdaChatModelAdapterOptions
): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal }) {
      const threadId = options.getThreadId()
      const runId = crypto.randomUUID()
      const resolvedUrl = options.endpoint ?? apiUrl("/api/ai/agent")

      const formattedMessages = messages.map((msg) => {
        let text = ""
        for (const part of msg.content) {
          if (part.type === "text") {
            text += part.text
          }
        }
        return {
          role: msg.role,
          content: text,
        }
      })

      const forwardedProps: Record<string, unknown> = {}
      const context = collectOlorinContext()
      if (Object.keys(context).length > 0) {
        forwardedProps.ardaContext = context
      }

      const response = await fetch(resolvedUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        credentials: "include",
        body: JSON.stringify({
          threadId,
          runId,
          messages: formattedMessages,
          ...(Object.keys(forwardedProps).length > 0 ? { forwardedProps } : {}),
        }),
        signal: abortSignal,
      })

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

      if (!response.body) {
        throw new Error("No response stream available")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let accumulatedText = ""
      const toolCallsMap = new Map<
        string,
        {
          toolCallId: string
          toolName: string
          args: Record<string, unknown>
          result?: Record<string, unknown>
        }
      >()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith("data:")) continue
            const dataStr = trimmed.slice(5).trim()
            if (!dataStr) continue

            try {
              const event = JSON.parse(dataStr) as ArdaSSEEvent

              if (event.type === "TEXT_MESSAGE_CONTENT" && event.delta) {
                accumulatedText += event.delta
              } else if (event.type === "TOOL_CALL_START") {
                toolCallsMap.set(event.callId, {
                  toolCallId: event.callId,
                  toolName: event.toolName,
                  args: {},
                })
              } else if (event.type === "TOOL_CALL_RESULT") {
                const existing = toolCallsMap.get(event.callId) ?? {
                  toolCallId: event.callId,
                  toolName: event.toolName,
                  args: {},
                }
                existing.result = event.result
                toolCallsMap.set(event.callId, existing)
              } else if (event.type === "RUN_FINISHED") {
                if (event.error) {
                  throw new Error(event.error)
                }
              }

              const contentParts: MessagePart[] = []
              if (accumulatedText) {
                contentParts.push({ type: "text", text: accumulatedText })
              }
              for (const tool of toolCallsMap.values()) {
                contentParts.push({
                  type: "tool-call",
                  toolCallId: tool.toolCallId,
                  toolName: tool.toolName,
                  args: tool.args as Record<string, never>,
                  argsText: JSON.stringify(tool.args),
                  result: tool.result,
                })
              }

              yield {
                content:
                  contentParts.length > 0
                    ? contentParts
                    : [{ type: "text", text: "" }],
              }
            } catch (innerErr) {
              if (
                innerErr instanceof Error &&
                innerErr.name === "AbortError"
              ) {
                throw innerErr
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    },
  }
}
