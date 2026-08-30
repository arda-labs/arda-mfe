import type { ChatModelAdapter, ChatModelRunResult, ChatModelRunUpdate } from "@assistant-ui/react"
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

// AI SDK UI Message Stream v1 parts — the only SSE dialect the backend
// emits (AI SDK spec; the response carries `x-vercel-ai-ui-message-stream: v1`).
export type ArdaStreamPart =
  | { type: "start"; messageId?: string }
  | { type: "start-step" }
  | { type: "text-start"; id: string }
  | { type: "text-delta"; id: string; delta: string }
  | { type: "text-end"; id: string }
  | { type: "reasoning-start"; id: string }
  | { type: "reasoning-delta"; id: string; delta: string }
  | { type: "reasoning-end"; id: string }
  | { type: "tool-input-start"; toolCallId: string; toolName: string }
  | { type: "tool-input-delta"; toolCallId: string; inputTextDelta: string }
  | { type: "tool-input-available"; toolCallId: string; toolName: string; input: unknown }
  | { type: "tool-output-available"; toolCallId: string; output: unknown }
  | { type: "tool-output-error"; toolCallId: string; errorText: string }
  | { type: "tool-approval-request"; toolCallId: string; approvalId: string; reason?: string }
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
  argsComplete: boolean
  result?: Record<string, unknown>
  startedAt: number
  completedAt?: number
}

// buildContent mirrors the adapter state (text + reasoning + tool calls) into
// the assistant-ui message content shape. Tool parts carry library-native
// timing so primitives (useToolCallElapsed) work.
function buildContent(
  accumulatedText: string,
  reasoningText: string,
  toolCalls: IterableIterator<ToolCallState>
): MessagePart[] {
  const contentParts: MessagePart[] = []
  if (reasoningText) {
    contentParts.push({ type: "reasoning", text: reasoningText })
  }
  if (accumulatedText) {
    contentParts.push({ type: "text", text: accumulatedText })
  }
  for (const tool of toolCalls) {
    const result = tool.result
    contentParts.push({
      type: "tool-call",
      toolCallId: tool.toolCallId,
      toolName: tool.toolName,
      args: tool.args as Record<string, never>,
      argsText: JSON.stringify(tool.args),
      timing: {
        startedAt: tool.startedAt,
        ...(tool.completedAt !== undefined ? { completedAt: tool.completedAt } : {}),
      },
      result,
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
      if (protocol !== "v1") {
        // The only supported SSE dialect is AI SDK UI Message Stream v1.
        // Anything else is a backend mismatch — fail loudly instead of
        // silently swallowing the stream.
        throw new Error(
          `Unsupported AI stream protocol: ${protocol ?? "none"} (expected v1)`
        )
      }
      reportRunStart(threadId)
      try {
        yield* runStream(response.body.getReader())
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

// createArdaResumeStream wraps an execution-response SSE stream as an
// assistant-ui run stream, for feeding HITL resume continuations into
// runtime.thread.resumeRun({ stream }).
export function createArdaResumeStream(
  response: Response
): AsyncGenerator<ChatModelRunResult, void, unknown> {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  if (!response.body) {
    throw new Error("No response stream available")
  }
  const protocol = response.headers.get("x-vercel-ai-ui-message-stream")
  if (protocol !== "v1") {
    throw new Error(
      `Unsupported AI stream protocol: ${protocol ?? "none"} (expected v1)`
    )
  }
  return runStream(response.body.getReader())
}

// runStream parses AI SDK UI Message Stream v1 parts:
// streamed text deltas, streamed tool input (args reassembled from deltas),
// structured tool outputs, and error parts that fail the run properly.
async function* runStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<ChatModelRunUpdate, void, unknown> {
  let accumulatedText = ""
  let accumulatedReasoning = ""
  let streamError: string | null = null
  const argsText = new Map<string, string>()
  const toolCalls = new Map<string, ToolCallState>()

  for await (const data of readSSEDataLines(reader)) {
    let part: ArdaStreamPart
    try {
      part = JSON.parse(data) as ArdaStreamPart
    } catch {
      continue // tolerate a malformed line; the next line re-syncs
    }

    switch (part.type) {
      case "text-delta":
        accumulatedText += part.delta
        reportTextDelta()
        break
      case "reasoning-delta":
        accumulatedReasoning += part.delta
        break
      case "tool-input-start":
        toolCalls.set(part.toolCallId, {
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          args: {},
          argsComplete: false,
          startedAt: Date.now(),
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
          argsComplete: true,
          startedAt: Date.now(),
        }
        if (part.input && typeof part.input === "object") {
          existing.args = part.input as Record<string, unknown>
        }
        existing.argsComplete = true
        toolCalls.set(part.toolCallId, existing)
        break
      }
      case "tool-output-available": {
        const existing = toolCalls.get(part.toolCallId) ?? {
          toolCallId: part.toolCallId,
          toolName: "unknown",
          args: parseArgsSafely(argsText.get(part.toolCallId)),
          argsComplete: true,
          startedAt: Date.now(),
        }
        existing.result =
          part.output && typeof part.output === "object"
            ? (part.output as Record<string, unknown>)
            : { text: String(part.output ?? "") }
        existing.completedAt = Date.now()
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
      content: buildContent(accumulatedText, accumulatedReasoning, toolCalls.values()),
    }
  }

  if (streamError) {
    throw new Error(streamError)
  }
}
