import { afterEach, describe, expect, test } from "bun:test"

import {
  AiAgentStreamError,
  createAiAgentTransport,
  type AiAgentRunInput,
} from "./ai-agent"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

const input: AiAgentRunInput = {
  threadId: "thread-1",
  runId: "run-1",
  messages: [{ id: "user-1", role: "user", content: "Xin chào" }],
}

function streamResponse(events: string[], requestId = "server-request-id") {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(events.join("")))
        controller.close()
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "X-Request-Id": requestId,
      },
    }
  )
}

function event(value: Record<string, unknown>): string {
  return `data: ${JSON.stringify(value)}\n\n`
}

describe("createAiAgentTransport", () => {
  test("sends canonical credentials, request ID, JSON input and returns a terminal result", async () => {
    let receivedInit: RequestInit | undefined
    let receivedUrl = ""
    globalThis.fetch = async (url, init) => {
      receivedUrl = String(url)
      receivedInit = init
      return streamResponse([
        event({ type: "RUN_STARTED", threadId: "thread-1", runId: "run-1" }),
        event({
          type: "TEXT_MESSAGE_START",
          messageId: "message-1",
          role: "assistant",
        }),
        event({
          type: "TEXT_MESSAGE_CONTENT",
          messageId: "message-1",
          delta: "Xin chào",
        }),
        event({ type: "TEXT_MESSAGE_END", messageId: "message-1" }),
        event({
          type: "RUN_FINISHED",
          threadId: "thread-1",
          runId: "run-1",
          outcome: { type: "success" },
        }),
        "data: [DONE]\n\n",
      ])
    }

    const transport = createAiAgentTransport({
      url: "https://api.example.test/api/ai/agent",
    })
    const result = await transport.run(input, { requestId: "request-1" })

    expect(receivedUrl).toBe("https://api.example.test/api/ai/agent")
    expect(receivedInit?.method).toBe("POST")
    expect(receivedInit?.credentials).toBe("include")
    expect(new Headers(receivedInit?.headers).get("Accept")).toBe(
      "text/event-stream"
    )
    expect(new Headers(receivedInit?.headers).get("X-Request-Id")).toBe(
      "request-1"
    )
    expect(JSON.parse(String(receivedInit?.body))).toEqual(input)
    expect(result.requestId).toBe("request-1")
    expect(result.ok).toBe(true)
    expect(result.terminal).toMatchObject({
      type: "RUN_FINISHED",
      outcome: { type: "success" },
    })
  })

  test("parses multiline SSE data and exposes RUN_ERROR as a terminal result", async () => {
    globalThis.fetch = async () =>
      streamResponse([
        "data: {\"type\":\"RUN_STARTED\",\"threadId\":\"thread-1\",\n",
        "data: \"runId\":\"run-1\"}\n\n",
        event({
          type: "RUN_ERROR",
          code: "ai.model_unavailable",
          message: "Model unavailable",
        }),
      ])

    const transport = createAiAgentTransport({ url: "/api/ai/agent" })
    const result = await transport.run(input)

    expect(result.ok).toBe(false)
    expect(result.terminal).toMatchObject({
      type: "RUN_ERROR",
      code: "ai.model_unavailable",
    })
  })

  test("forwards AbortSignal and classifies aborted requests", async () => {
    let receivedSignal: AbortSignal | undefined
    globalThis.fetch = async (_url, init) => {
      receivedSignal = init?.signal as AbortSignal
      return await new Promise<Response>((_resolve, reject) => {
        receivedSignal?.addEventListener("abort", () => {
          const error = new Error("aborted")
          error.name = "AbortError"
          reject(error)
        })
      })
    }

    const controller = new AbortController()
    const transport = createAiAgentTransport({ url: "/api/ai/agent" })
    const pending = transport.run(input, { signal: controller.signal })
    controller.abort()
    const error = await pending.catch((reason) => reason)

    expect(receivedSignal).toBe(controller.signal)
    expect(error).toBeInstanceOf(AiAgentStreamError)
    expect(error).toMatchObject({ kind: "aborted" })
  })

  test("rejects a stream that closes before a terminal event", async () => {
    globalThis.fetch = async () =>
      streamResponse([
        event({ type: "RUN_STARTED", threadId: "thread-1", runId: "run-1" }),
      ])

    const transport = createAiAgentTransport({ url: "/api/ai/agent" })
    const error = await transport.run(input).catch((reason) => reason)

    expect(error).toBeInstanceOf(AiAgentStreamError)
    expect(error).toMatchObject({ kind: "protocol" })
    expect(error.message).toContain("without RUN_FINISHED or RUN_ERROR")
  })

  test("rejects events emitted after a terminal event", async () => {
    globalThis.fetch = async () =>
      streamResponse([
        event({ type: "RUN_STARTED", threadId: "thread-1", runId: "run-1" }),
        event({ type: "RUN_FINISHED", threadId: "thread-1", runId: "run-1" }),
        event({ type: "CUSTOM", name: "late-event", value: {} }),
      ])

    const transport = createAiAgentTransport({ url: "/api/ai/agent" })
    const error = await transport.run(input).catch((reason) => reason)

    expect(error).toBeInstanceOf(AiAgentStreamError)
    expect(error.message).toContain("after its terminal event")
  })

  test("rejects a 200 JSON placeholder instead of treating it as a chat result", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ success: true, result: {} }), {
        headers: { "Content-Type": "application/json" },
      })

    const transport = createAiAgentTransport({ url: "/api/ai/agent" })
    const error = await transport.run(input).catch((reason) => reason)

    expect(error).toBeInstanceOf(AiAgentStreamError)
    expect(error).toMatchObject({ kind: "protocol" })
    expect(error.message).toContain("expected text/event-stream")
  })

  test("maps non-2xx problem responses to a typed HTTP error", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          code: "ai.rate_limited",
          message: "Too many requests",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/problem+json",
            "X-Request-Id": "request-429",
          },
        }
      )

    const transport = createAiAgentTransport({ url: "/api/ai/agent" })
    const error = await transport.run(input).catch((reason) => reason)

    expect(error).toBeInstanceOf(AiAgentStreamError)
    expect(error).toMatchObject({
      kind: "http",
      status: 429,
      code: "ai.rate_limited",
      requestId: "request-429",
    })
  })
})
