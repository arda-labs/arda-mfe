import { createRequestId } from "./list"
import { createCredentialedFetch, type ApiClientErrorPayload } from "./client"

/** The protocol identifier used by the Arda AI HTTP boundary. */
export const AI_AGENT_PROTOCOL = "ag-ui"
export const AI_AGENT_PROTOCOL_VERSION = "1"

export type AiAgentMessageRole =
  | "developer"
  | "system"
  | "user"
  | "assistant"
  | "tool"

/**
 * The input is deliberately open ended. AG-UI adds fields over time (tools,
 * context and resume entries), so the transport must forward them without
 * rebuilding or silently dropping fields owned by the protocol client.
 */
export type AiAgentRunInput = {
  threadId: string
  runId: string
  messages: readonly Record<string, unknown>[]
  [key: string]: unknown
}

export type AiAgentEventType =
  | "RUN_STARTED"
  | "RUN_FINISHED"
  | "RUN_ERROR"
  | "TEXT_MESSAGE_START"
  | "TEXT_MESSAGE_CONTENT"
  | "TEXT_MESSAGE_END"
  | "TOOL_CALL_START"
  | "TOOL_CALL_ARGS"
  | "TOOL_CALL_END"
  | "TOOL_CALL_RESULT"
  | "REASONING_START"
  | "REASONING_END"
  | "REASONING_MESSAGE_START"
  | "REASONING_MESSAGE_CONTENT"
  | "REASONING_MESSAGE_END"
  | "CUSTOM"

export type AiAgentRunStartedEvent = AiAgentEventBase<"RUN_STARTED"> & {
  threadId: string
  runId: string
}

export type AiAgentRunFinishedEvent = AiAgentEventBase<"RUN_FINISHED"> & {
  threadId: string
  runId: string
  outcome?: AiAgentRunOutcome | null
  result?: unknown
}

export type AiAgentRunErrorEvent = AiAgentEventBase<"RUN_ERROR"> & {
  message: string
  code?: string
  threadId?: string
  runId?: string
  usage?: unknown
}

export type AiAgentTextMessageEvent =
  | (AiAgentEventBase<"TEXT_MESSAGE_START"> & {
      messageId: string
      role?: "assistant" | "user" | "system" | "developer"
      name?: string
    })
  | (AiAgentEventBase<"TEXT_MESSAGE_CONTENT"> & {
      messageId: string
      delta: string
    })
  | (AiAgentEventBase<"TEXT_MESSAGE_END"> & { messageId: string })

export type AiAgentToolCallEvent =
  | (AiAgentEventBase<"TOOL_CALL_START"> & {
      toolCallId: string
      toolCallName?: string
    })
  | (AiAgentEventBase<"TOOL_CALL_ARGS"> & {
      toolCallId: string
      delta: string
    })
  | (AiAgentEventBase<"TOOL_CALL_END"> & { toolCallId: string })
  | (AiAgentEventBase<"TOOL_CALL_RESULT"> & {
      toolCallId: string
      messageId?: string
      content?: string
      result?: unknown
      role?: "tool"
    })

export type AiAgentReasoningEvent =
  | (AiAgentEventBase<"REASONING_MESSAGE_START"> & {
      messageId: string
      role?: "reasoning"
    })
  | (AiAgentEventBase<"REASONING_MESSAGE_CONTENT"> & {
      messageId: string
      delta: string
    })
  | (AiAgentEventBase<"REASONING_MESSAGE_END"> & { messageId: string })

export type AiAgentReasoningBoundaryEvent =
  | (AiAgentEventBase<"REASONING_START"> & { messageId?: string })
  | (AiAgentEventBase<"REASONING_END"> & { messageId?: string })

export type AiAgentCustomEvent = AiAgentEventBase<"CUSTOM"> & {
  name: string
  value?: unknown
}

export type AiAgentKnownEvent =
  | AiAgentRunStartedEvent
  | AiAgentRunFinishedEvent
  | AiAgentRunErrorEvent
  | AiAgentTextMessageEvent
  | AiAgentToolCallEvent
  | AiAgentReasoningEvent
  | AiAgentReasoningBoundaryEvent
  | AiAgentCustomEvent

/** Unknown events are retained for forward compatibility and observability. */
export type AiAgentEvent = AiAgentKnownEvent | AiAgentUnknownEvent

export type AiAgentUnknownEvent = {
  type: string
  [key: string]: unknown
}

type AiAgentEventBase<T extends AiAgentEventType> = {
  type: T
  timestamp?: number
  rawEvent?: unknown
  [key: string]: unknown
}

export type AiAgentRunOutcome =
  | { type: "success" }
  | {
      type: "interrupt"
      interrupts: Array<{
        id: string
        reason: string
        message?: string
        toolCallId?: string
        expiresAt?: string
        [key: string]: unknown
      }>
    }
  | { type: string; [key: string]: unknown }

export type AiAgentTerminalEvent =
  | AiAgentRunFinishedEvent
  | AiAgentRunErrorEvent

export type AiAgentStreamOptions = {
  signal?: AbortSignal
  /** Supply a logical request ID when retrying; otherwise one is generated. */
  requestId?: string
  headers?: HeadersInit
}

export type AiAgentTransportOptions = {
  url: string
  fetch?: typeof fetch
  headers?: HeadersInit
  maxEventBytes?: number
}

export type AiAgentRunResult = {
  events: AiAgentEvent[]
  terminal: AiAgentTerminalEvent
  requestId: string
  ok: boolean
}

export type AiAgentStreamErrorKind =
  | "aborted"
  | "http"
  | "protocol"
  | "remote"

/** A stable error shape for UI retry/error states and telemetry. */
export class AiAgentStreamError extends Error {
  readonly kind: AiAgentStreamErrorKind
  readonly status?: number
  readonly code?: string
  readonly requestId?: string
  readonly event?: AiAgentRunErrorEvent

  constructor(
    message: string,
    details: {
      kind: AiAgentStreamErrorKind
      status?: number
      code?: string
      requestId?: string
      event?: AiAgentRunErrorEvent
    }
  ) {
    super(message)
    this.name = "AiAgentStreamError"
    this.kind = details.kind
    this.status = details.status
    this.code = details.code
    this.requestId = details.requestId
    this.event = details.event
  }
}

export type AiAgentTransport = {
  stream(
    input: AiAgentRunInput,
    options?: AiAgentStreamOptions
  ): AsyncGenerator<AiAgentEvent, AiAgentTerminalEvent, void>
  run(
    input: AiAgentRunInput,
    options?: AiAgentStreamOptions
  ): Promise<AiAgentRunResult>
}

/**
 * Creates the canonical AG-UI HTTP transport used by non-React callers and
 * tests. `stream` yields every validated event, including the terminal event;
 * it rejects when the server closes without exactly one terminal event. A
 * `RUN_ERROR` is a valid remote terminal and is exposed in `run().terminal`.
 */
export function createAiAgentTransport(
  options: AiAgentTransportOptions
): AiAgentTransport {
  if (!options.url.trim()) {
    throw new Error("AI agent URL is required")
  }

  const fetchWithCredentials = createCredentialedFetch(
    options.fetch ?? globalThis.fetch
  )
  const maxEventBytes = options.maxEventBytes ?? 256 * 1024

  async function* stream(
    input: AiAgentRunInput,
    streamOptions: AiAgentStreamOptions = {}
  ): AsyncGenerator<AiAgentEvent, AiAgentTerminalEvent, void> {
    const requestId = streamOptions.requestId?.trim() || createRequestId()
    const headers = new Headers(options.headers)
    for (const [key, value] of new Headers(streamOptions.headers)) {
      headers.set(key, value)
    }
    headers.set("Accept", "text/event-stream")
    headers.set("Content-Type", "application/json")
    headers.set("X-Request-Id", requestId)

    let response: Response
    try {
      response = await fetchWithCredentials(options.url, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(input),
        signal: streamOptions.signal,
      })
    } catch (error) {
      if (isAbortError(error) || streamOptions.signal?.aborted) {
        throw new AiAgentStreamError("AI agent stream was aborted", {
          kind: "aborted",
          requestId,
        })
      }
      throw new AiAgentStreamError("AI agent request failed", {
        kind: "http",
        requestId,
      })
    }

    const responseRequestId =
      response.headers.get("X-Request-Id") || requestId
    if (!response.ok) {
      throw await toHttpStreamError(response, responseRequestId)
    }
    if (!response.body) {
      throw new AiAgentStreamError("AI agent returned an empty stream", {
        kind: "protocol",
        requestId: responseRequestId,
      })
    }
    const contentType = response.headers
      .get("Content-Type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase()
    if (contentType && contentType !== "text/event-stream") {
      throw protocolError(
        `AI agent returned ${contentType}; expected text/event-stream`,
        responseRequestId
      )
    }

    let terminal: AiAgentTerminalEvent | undefined
    const orderState: AiAgentEventOrderState = {
      started: false,
      textMessageIds: new Set(),
      toolCallIds: new Set(),
      reasoningMessageIds: new Set(),
    }
    try {
      for await (const payload of parseSsePayloads(
        response.body,
        streamOptions.signal,
        maxEventBytes
      )) {
        const event = parseAiAgentEvent(payload, responseRequestId)
        validateEventOrder(event, orderState, responseRequestId)
        if (isTerminalEvent(event)) {
          if (terminal) {
            throw protocolError(
              "AI agent emitted more than one terminal event",
              responseRequestId
            )
          }
          terminal = event
        } else if (terminal) {
          throw protocolError(
            "AI agent emitted an event after its terminal event",
            responseRequestId
          )
        }
        yield event
      }
    } catch (error) {
      if (error instanceof AiAgentStreamError) throw error
      if (isAbortError(error) || streamOptions.signal?.aborted) {
        throw new AiAgentStreamError("AI agent stream was aborted", {
          kind: "aborted",
          requestId: responseRequestId,
        })
      }
      throw protocolError("AI agent stream could not be read", responseRequestId)
    }

    if (!terminal) {
      throw protocolError(
        "AI agent stream ended without RUN_FINISHED or RUN_ERROR",
        responseRequestId
      )
    }
    return terminal
  }

  async function run(
    input: AiAgentRunInput,
    streamOptions: AiAgentStreamOptions = {}
  ): Promise<AiAgentRunResult> {
    const requestId = streamOptions.requestId?.trim() || createRequestId()
    const events: AiAgentEvent[] = []
    let terminal: AiAgentTerminalEvent | undefined
    for await (const event of stream(input, {
      ...streamOptions,
      requestId,
    })) {
      events.push(event)
      if (isTerminalEvent(event)) terminal = event
    }
    if (!terminal) {
      // `stream` already enforces this invariant. Keep the guard here so a
      // future implementation cannot accidentally return an invalid result.
      throw protocolError("AI agent stream has no terminal event", requestId)
    }
    return {
      events,
      terminal,
      requestId,
      ok: terminal.type === "RUN_FINISHED",
    }
  }

  return { stream, run }
}

function isTerminalEvent(event: AiAgentEvent): event is AiAgentTerminalEvent {
  return event.type === "RUN_FINISHED" || event.type === "RUN_ERROR"
}

type AiAgentEventOrderState = {
  started: boolean
  textMessageIds: Set<string>
  toolCallIds: Set<string>
  reasoningMessageIds: Set<string>
}

/**
 * Validate the lifecycle rules that matter to a streaming UI. The AG-UI
 * client also verifies these rules, but enforcing them here gives callers a
 * deterministic protocol error before malformed data reaches application
 * state. Unknown event types remain forward compatible.
 */
function validateEventOrder(
  event: AiAgentEvent,
  state: AiAgentEventOrderState,
  requestId: string
): void {
  const record = event as Record<string, unknown>
  const id = (field: string): string => String(record[field] ?? "")
  if (!state.started && event.type !== "RUN_STARTED" && event.type !== "RUN_ERROR") {
    throw protocolError(
      "AI agent stream must begin with RUN_STARTED",
      requestId
    )
  }
  switch (event.type) {
    case "RUN_STARTED":
      if (state.started) {
        throw protocolError("AI agent emitted duplicate RUN_STARTED", requestId)
      }
      state.started = true
      return
    case "RUN_ERROR":
      return
    case "RUN_FINISHED":
      if (!state.started) {
        throw protocolError(
          "AI agent emitted RUN_FINISHED before RUN_STARTED",
          requestId
        )
      }
      if (
        state.textMessageIds.size > 0 ||
        state.toolCallIds.size > 0 ||
        state.reasoningMessageIds.size > 0
      ) {
        throw protocolError(
          "AI agent emitted RUN_FINISHED with an active message or tool call",
          requestId
        )
      }
      return
    case "TEXT_MESSAGE_START":
      if (state.textMessageIds.has(id("messageId"))) {
        throw protocolError("AI agent started a duplicate text message", requestId)
      }
      state.textMessageIds.add(id("messageId"))
      return
    case "TEXT_MESSAGE_CONTENT":
    case "TEXT_MESSAGE_END":
      if (!state.textMessageIds.has(id("messageId"))) {
        throw protocolError(
          `AI agent emitted ${event.type} for an inactive text message`,
          requestId
        )
      }
      if (event.type === "TEXT_MESSAGE_END") {
        state.textMessageIds.delete(id("messageId"))
      }
      return
    case "TOOL_CALL_START":
      if (state.toolCallIds.has(id("toolCallId"))) {
        throw protocolError("AI agent started a duplicate tool call", requestId)
      }
      state.toolCallIds.add(id("toolCallId"))
      return
    case "TOOL_CALL_ARGS":
      if (!state.toolCallIds.has(id("toolCallId"))) {
        throw protocolError("AI agent emitted args for an inactive tool call", requestId)
      }
      return
    case "TOOL_CALL_END":
      if (!state.toolCallIds.has(id("toolCallId"))) {
        throw protocolError("AI agent ended an inactive tool call", requestId)
      }
      state.toolCallIds.delete(id("toolCallId"))
      return
    case "REASONING_MESSAGE_START":
      if (state.reasoningMessageIds.has(id("messageId"))) {
        throw protocolError("AI agent started duplicate reasoning", requestId)
      }
      state.reasoningMessageIds.add(id("messageId"))
      return
    case "REASONING_MESSAGE_CONTENT":
    case "REASONING_MESSAGE_END":
      if (!state.reasoningMessageIds.has(id("messageId"))) {
        throw protocolError(
          `AI agent emitted ${event.type} for inactive reasoning`,
          requestId
        )
      }
      if (event.type === "REASONING_MESSAGE_END") {
        state.reasoningMessageIds.delete(id("messageId"))
      }
      return
  }
}

function parseAiAgentEvent(
  payload: unknown,
  requestId: string
): AiAgentEvent {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw protocolError("AI agent emitted a non-object event", requestId)
  }
  const event = payload as Record<string, unknown>
  if (typeof event.type !== "string" || !event.type.trim()) {
    throw protocolError("AI agent event is missing type", requestId)
  }

  const required = (field: string): string => {
    const value = event[field]
    if (typeof value !== "string" || !value.trim()) {
      throw protocolError(
        `AI agent ${event.type} event is missing ${field}`,
        requestId
      )
    }
    return value
  }

  switch (event.type) {
    case "RUN_STARTED":
      required("threadId")
      required("runId")
      break
    case "RUN_FINISHED":
      required("threadId")
      required("runId")
      if (event.outcome !== undefined && event.outcome !== null) {
        if (
          typeof event.outcome !== "object" ||
          Array.isArray(event.outcome) ||
          typeof (event.outcome as Record<string, unknown>).type !== "string"
        ) {
          throw protocolError(
            "AI agent RUN_FINISHED outcome is invalid",
            requestId
          )
        }
      }
      break
    case "RUN_ERROR":
      required("message")
      break
    case "TEXT_MESSAGE_START":
    case "TEXT_MESSAGE_END":
    case "REASONING_MESSAGE_START":
    case "REASONING_MESSAGE_END":
      required("messageId")
      break
    case "TEXT_MESSAGE_CONTENT":
    case "REASONING_MESSAGE_CONTENT":
      required("messageId")
      required("delta")
      break
    case "REASONING_START":
    case "REASONING_END":
      break
    case "TOOL_CALL_START":
    case "TOOL_CALL_END":
    case "TOOL_CALL_RESULT":
      required("toolCallId")
      break
    case "TOOL_CALL_ARGS":
      required("toolCallId")
      required("delta")
      break
    case "CUSTOM":
      required("name")
      break
  }
  return event as AiAgentEvent
}

async function* parseSsePayloads(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal | undefined,
  maxEventBytes: number
): AsyncGenerator<unknown, void, void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let dataLines: string[] = []
  let dataBytes = 0
  let doneReading = false

  const dispatch = (): unknown | undefined => {
    if (dataLines.length === 0) return undefined
    const data = dataLines.join("\n")
    dataLines = []
    dataBytes = 0
    if (data.trim() === "[DONE]") return undefined
    try {
      return JSON.parse(data) as unknown
    } catch {
      throw new Error("invalid SSE JSON payload")
    }
  }

  try {
    for (;;) {
      if (signal?.aborted) throw abortError()
      const read = await reader.read()
      if (read.done) {
        doneReading = true
        buffer += decoder.decode()
      } else {
        buffer += decoder.decode(read.value, { stream: true })
      }

      let lineEnd = buffer.indexOf("\n")
      while (lineEnd >= 0) {
        let line = buffer.slice(0, lineEnd)
        buffer = buffer.slice(lineEnd + 1)
        if (line.endsWith("\r")) line = line.slice(0, -1)
        if (line === "") {
          const payload = dispatch()
          if (payload !== undefined) yield payload
        } else if (!line.startsWith(":") && line.startsWith("data:")) {
          const value = line.slice(5).startsWith(" ")
            ? line.slice(6)
            : line.slice(5)
          dataBytes += value.length
          if (dataBytes > maxEventBytes) {
            throw new Error("SSE event exceeds configured size limit")
          }
          dataLines.push(value)
        }
        lineEnd = buffer.indexOf("\n")
      }
      if (doneReading) break
    }

    if (buffer.length > 0) {
      const line = buffer.endsWith("\r")
        ? buffer.slice(0, -1)
        : buffer
      if (line.startsWith("data:")) {
        const value = line.slice(5).startsWith(" ")
          ? line.slice(6)
          : line.slice(5)
        dataBytes += value.length
        if (dataBytes > maxEventBytes) {
          throw new Error("SSE event exceeds configured size limit")
        }
        dataLines.push(value)
      }
    }
    const payload = dispatch()
    if (payload !== undefined) yield payload
  } finally {
    if (!doneReading) await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

async function toHttpStreamError(
  response: Response,
  requestId: string
): Promise<AiAgentStreamError> {
  const fallbackCode = `ai.http_${response.status}`
  let payload: Partial<ApiClientErrorPayload> | undefined
  try {
    const text = await response.text()
    const parsed: unknown = JSON.parse(text)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const value = parsed as Record<string, unknown>
      payload = {
        code: typeof value.code === "string" ? value.code : undefined,
        message:
          typeof value.message === "string" ? value.message : undefined,
      }
    }
  } catch {
    // The status and correlation ID below are sufficient for callers when a
    // proxy returns HTML or closes the body before sending a problem payload.
  }
  return new AiAgentStreamError(
    payload?.message || `AI agent request failed (${response.status})`,
    {
      kind: "http",
      status: response.status,
      code: payload?.code || fallbackCode,
      requestId,
    }
  )
}

function protocolError(message: string, requestId: string): AiAgentStreamError {
  return new AiAgentStreamError(message, {
    kind: "protocol",
    requestId,
  })
}

function abortError(): Error {
  const error = new Error("The operation was aborted")
  error.name = "AbortError"
  return error
}

function isAbortError(value: unknown): boolean {
  return (
    value instanceof Error && value.name === "AbortError"
  )
}
