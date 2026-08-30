import type { ChatModelAdapter, ChatModelRunUpdate } from "@assistant-ui/react"
import { apiUrl } from "@workspace/api/url"
import { collectOlorinContext } from "./registry"
import {
  reportRunEnd,
  reportRunFailed,
  reportRunStart,
  reportTextDelta,
  reportToolDone,
  reportToolStart,
} from "./run-status"

// Legacy AG-UI-style events emitted when the backend runs AI_PROTOCOL=v1.
export type ArdaSSEEvent =
  | { type: "RUN_STARTED"; threadId: string; runId: string }
  | { type: "TEXT_MESSAGE_START"; threadId: string; runId: string; messageId: string }
  | { type: "TEXT_MESSAGE_CONTENT"; threadId: string; runId: string; messageId: string; delta: string }
  | { type: "TEXT_MESSAGE_END"; threadId: string; runId: string; messageId: string }
  | { type: "TOOL_CALL_START"; threadId: string; runId: string; callId: string; toolName: string }
  | {
      type: "TOOL_CALL_ARGS"
      threadId: string
      runId: string
      callId: string
      toolName: string
      delta: string
    }
  | {
      type: "TOOL_CALL_RESULT"
      threadId: string
      runId: string
      callId: string
      toolName: string
      result: Record<string, unknown>
    }
  | { type: "RUN_FINISHED"; threadId: string; runId: string; error?: string }

// AI SDK UI Message Stream v1 parts, emitted when AI_PROTOCOL=v2.
// Shapes follow the vercel/ai UIMessageChunk spec.
export type ArdaUIStreamPart =
  | { type: "start"; messageId?: string }
  | { type: "start-step" }
  | { type: "text-start"; id: string }
  | { type: "text-delta"; id: string; delta: string }
  | { type: "text-end"; id: string }
  | { type: "tool-input-start"; toolCallId: string; toolName: string }
  | { type: "tool-input-delta"; toolCallId: string; inputTextDelta: string }
  | { type: "tool-input-available"; toolCallId: string; toolName: string; input: unknown }
  | { type: "tool-output-available"; toolCallId: string; output: unknown }
  | { type: "tool-output-error"; toolCallId: string; errorText: string }
  | { type: "error"; errorText: string }
  | { type: "finish-step" }
  | { type: "finish"; finishReason?: string }

export type ArdaChatModelAdapterOptions = {
  getThreadId: () => string
  endpoint?: string
}

type MessagePart = NonNullable<ChatModelRunUpdate["content"]>[number]

type ToolCallState = {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  result?: Record<string, unknown>
}

// buildContent mirrors the adapter state (text + tool calls) into the
// assistant-ui message content shape.
function buildContent(
  accumulatedText: string,
  toolCalls: IterableIterator<ToolCallState>
): MessagePart[] {
  const contentParts: MessagePart[] = []
  if (accumulatedText) {
    contentParts.push({ type: "text", text: accumulatedText })
  }
  for (const tool of toolCalls) {
    contentParts.push({
      type: "tool-call",
      toolCallId: tool.toolCallId,
      toolName: tool.toolName,
      args: tool.args as Record<string, never>,
      argsText: JSON.stringify(tool.args),
      result: tool.result,
    })
  }
  return contentParts.length > 0
    ? contentParts
    : [{ type: "text", text: "" }]
}

// readSSEDataLines yields raw `data:` payload strings from the response body.
// A malformed JSON payload must be tolerated by the consumer (parse in its own
// try/catch); semantic errors thrown by the consumer propagate and are
// deliberately never swallowed.
async function* readSSEDataLines(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<string, void, unknown> {
  const decoder = new TextDecoder()
  let buffer = ""
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
        yield dataStr
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function parseArgsSafely(argsText: string | undefined): Record<string, unknown> {
  if (!argsText) return {}
  try {
    const parsed = JSON.parse(argsText) as unknown
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

// tryParseJSONObject returns the parsed object only when the accumulated
// args text is complete, valid JSON — otherwise null (still streaming).
function tryParseJSONObject(value: string): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}

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

      const protocol = response.headers.get("x-vercel-ai-ui-message-stream")
      reportRunStart(threadId)
      try {
        if (protocol === "v1") {
          yield* runUIStreamProtocol(response.body.getReader())
        } else {
          yield* runLegacyProtocol(response.body.getReader())
        }
        reportRunEnd()
      } catch (caught) {
        if (caught instanceof Error && caught.name === "AbortError") {
          reportRunEnd()
        } else {
          reportRunFailed(
            caught instanceof Error && caught.message
              ? caught.message
              : String(caught)
          )
        }
        throw caught
      }
    },
  }
}

// runUIStreamProtocol parses AI SDK UI Message Stream v1 parts (AI_PROTOCOL=v2):
// streamed text deltas, streamed tool input (args reassembled from deltas),
// structured tool outputs, and error parts that fail the run properly.
async function* runUIStreamProtocol(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<ChatModelRunUpdate, void, unknown> {
  let accumulatedText = ""
  let streamError: string | null = null
  const argsText = new Map<string, string>()
  const toolCalls = new Map<string, ToolCallState>()

  for await (const data of readSSEDataLines(reader)) {
    let part: ArdaUIStreamPart
    try {
      part = JSON.parse(data) as ArdaUIStreamPart
    } catch {
      continue // tolerate a malformed line; the next line re-syncs
    }

    switch (part.type) {
      case "text-delta":
        accumulatedText += part.delta
        reportTextDelta()
        break
      case "tool-input-start":
        toolCalls.set(part.toolCallId, {
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          args: {},
        })
        argsText.set(part.toolCallId, "")
        reportToolStart(part.toolName)
        break
      case "tool-input-delta": {
        const accumulated = (argsText.get(part.toolCallId) ?? "") + part.inputTextDelta
        argsText.set(part.toolCallId, accumulated)
        // Surface partially streamed args so the tool card can render the
        // code/query while the model is still writing it.
        const existing = toolCalls.get(part.toolCallId)
        if (existing) {
          const parsed = tryParseJSONObject(accumulated)
          if (parsed) existing.args = parsed
        }
        break
      }
      case "tool-input-available": {
        const existing = toolCalls.get(part.toolCallId) ?? {
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          args: parseArgsSafely(argsText.get(part.toolCallId)),
        }
        if (part.input && typeof part.input === "object") {
          existing.args = part.input as Record<string, unknown>
        }
        toolCalls.set(part.toolCallId, existing)
        break
      }
      case "tool-output-available": {
        const existing = toolCalls.get(part.toolCallId) ?? {
          toolCallId: part.toolCallId,
          toolName: "unknown",
          args: parseArgsSafely(argsText.get(part.toolCallId)),
        }
        existing.result =
          part.output && typeof part.output === "object"
            ? (part.output as Record<string, unknown>)
            : { text: String(part.output ?? "") }
        toolCalls.set(part.toolCallId, existing)
        reportToolDone()
        break
      }
      case "tool-output-error":
      case "error":
        // Keep reading until the stream closes; the run fails below.
        streamError = part.errorText
        break
      case "finish":
        break
      default:
        break
    }

    yield {
      content: buildContent(accumulatedText, toolCalls.values()),
    }
  }

  if (streamError) {
    throw new Error(streamError)
  }
}

// runLegacyProtocol parses the AG-UI-style events (AI_PROTOCOL=v1, default).
async function* runLegacyProtocol(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<ChatModelRunUpdate, void, unknown> {
  let accumulatedText = ""
  let streamError: string | null = null
  const toolCalls = new Map<string, ToolCallState>()

  for await (const data of readSSEDataLines(reader)) {
    let event: ArdaSSEEvent
    try {
      event = JSON.parse(data) as ArdaSSEEvent
    } catch {
      continue
    }

    switch (event.type) {
      case "TEXT_MESSAGE_CONTENT":
        if (event.delta) {
          accumulatedText += event.delta
          reportTextDelta()
        }
        break
      case "TOOL_CALL_START":
        toolCalls.set(event.callId, {
          toolCallId: event.callId,
          toolName: event.toolName,
          args: {},
        })
        reportToolStart(event.toolName)
        break
      case "TOOL_CALL_ARGS": {
        // Legacy protocol sends the full argument payload in one event.
        const existing = toolCalls.get(event.callId)
        if (existing) {
          const parsed = tryParseJSONObject(event.delta)
          if (parsed) existing.args = parsed
        }
        break
      }
      case "TOOL_CALL_RESULT": {
        const existing = toolCalls.get(event.callId) ?? {
          toolCallId: event.callId,
          toolName: event.toolName,
          args: {},
        }
        existing.result = event.result
        toolCalls.set(event.callId, existing)
        reportToolDone()
        break
      }
      case "RUN_FINISHED":
        if (event.error) {
          streamError = event.error
        }
        break
      default:
        break
    }

    yield {
      content: buildContent(accumulatedText, toolCalls.values()),
    }
  }

  if (streamError) {
    // Errors from the server must fail the run instead of ending silently.
    throw new Error(streamError)
  }
}
