import { afterEach, describe, expect, test } from "bun:test"
import { ApiClientError, createApiClient, createCredentialedFetch } from "./client"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe("createApiClient GET lifecycle", () => {
  test("credentialed fetch preserves cookies and adds request correlation", async () => {
    let received: RequestInit | undefined
    const transport = createCredentialedFetch(async (_input, init) => {
      received = init
      return new Response("ok")
    })

    await transport("https://api.example.test/stream", { method: "POST" })

    expect(received?.credentials).toBe("include")
    expect(new Headers(received?.headers).get("X-Request-Id")).toBeTruthy()
  })

  test("deduplicates concurrent GET requests without an AbortSignal", async () => {
    let calls = 0
    globalThis.fetch = async () => {
      calls += 1
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    const client = createApiClient({ baseURL: "https://api.example.test" })
    await Promise.all([client.get("/items"), client.get("/items")])

    expect(calls).toBe(1)
  })

  test("sends the selected organization without trusting browser identity headers", async () => {
    let sentHeaders: Headers | undefined
    globalThis.fetch = async (_input, init) => {
      sentHeaders = new Headers(init?.headers)
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    const client = createApiClient({
      baseURL: "https://api.example.test",
      getActiveOrgId: () => "org-2",
    })
    await client.get("/items")

    expect(sentHeaders?.get("X-Org-Id")).toBe("org-2")
    expect(sentHeaders?.get("X-User-Id")).toBeNull()
  })

  test("includes browser session cookies for authenticated API calls", async () => {
    let credentials: RequestCredentials | undefined
    globalThis.fetch = async (_input, init) => {
      credentials = init?.credentials
      return new Response(JSON.stringify({ user_id: "u1" }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    const client = createApiClient({ baseURL: "https://api.example.test" })
    await client.get("/api/auth/me")

    expect(credentials).toBe("include")
  })

  test("sends command idempotency keys through the standard header", async () => {
    let sentHeaders: Headers | undefined
    globalThis.fetch = async (_input, init) => {
      sentHeaders = new Headers(init?.headers)
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    const client = createApiClient({ baseURL: "https://api.example.test" })
    await client.post("/items", { value: 1 }, { idempotencyKey: "retry-1" })

    expect(sentHeaders?.get("Idempotency-Key")).toBe("retry-1")
  })

  test("forwards AbortSignal and leaves dedupe to the server-state query", async () => {
    const signals: Array<AbortSignal | null | undefined> = []
    globalThis.fetch = async (_input, init) => {
      signals.push(init?.signal)
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    const client = createApiClient({ baseURL: "https://api.example.test" })
    const first = new AbortController()
    const second = new AbortController()
    await Promise.all([
      client.get("/items", { signal: first.signal }),
      client.get("/items", { signal: second.signal }),
    ])

    expect(signals).toEqual([first.signal, second.signal])
  })

  test("normalizes canonical problem errors", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          type: "https://arda.io.vn/problems/validation.invalid_input",
          title: "Bad Request",
          status: 400,
          code: "validation.invalid_input",
          message: "Invalid filter",
          request_id: "req-test",
        }),
        { status: 400, headers: { "Content-Type": "application/problem+json" } }
      )

    const client = createApiClient({ baseURL: "https://api.example.test" })
    const error = await client.get("/items").catch((reason) => reason)

    expect(error).toBeInstanceOf(ApiClientError)
    expect(error).toMatchObject({
      code: "validation.invalid_input",
      status: 400,
      requestId: "req-test",
    })
  })

  test("rejects legacy error envelopes instead of shape-falling back", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          error: { code: "validation.invalid_input", message: "Invalid filter" },
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": "legacy-request-id",
          },
        }
      )

    const client = createApiClient({ baseURL: "https://api.example.test" })
    const error = await client.get("/items").catch((reason) => reason)

    expect(error).toBeInstanceOf(ApiClientError)
    expect(error).toMatchObject({
      code: "common.error.api_failed",
      status: 400,
      requestId: "legacy-request-id",
    })
  })

  test("normalizes RFC-style root problems and response request id", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          type: "https://arda.io.vn/problems/validation",
          title: "Validation failed",
          status: 422,
          code: "validation.invalid_input",
          message: "Invalid payload",
          errors: [{ field: "email", code: "invalid_format", message: "Email is invalid" }],
        }),
        {
          status: 422,
          headers: {
            "Content-Type": "application/problem+json",
            "X-Request-Id": "header-request-id",
          },
        }
      )

    const client = createApiClient({ baseURL: "https://api.example.test" })
    const error = await client.post("/items", {}).catch((reason) => reason)

    expect(error).toBeInstanceOf(ApiClientError)
    expect(error).toMatchObject({
      code: "validation.invalid_input",
      status: 422,
      requestId: "header-request-id",
      errors: [{ field: "email", code: "invalid_format" }],
    })
  })

  test("supports text responses and empty 204 responses", async () => {
    globalThis.fetch = async (_input, init) =>
      init?.method === "GET"
        ? new Response("process definition")
        : new Response(null, { status: 204 })

    const client = createApiClient({ baseURL: "https://api.example.test" })
    expect(await client.getText("/definition")).toBe("process definition")
    expect(await client.post("/definition", {})).toBeUndefined()
  })

  test("preserves the logical request ID across recent-auth retry", async () => {
    const requestIds: string[] = []
    let calls = 0
    globalThis.fetch = async (_input, init) => {
      calls += 1
      requestIds.push(new Headers(init?.headers).get("X-Request-Id") ?? "")
      if (calls === 1) {
        return new Response(
          JSON.stringify({
            type: "https://arda.io.vn/problems/recent_auth_required",
            title: "Forbidden",
            status: 403,
            code: "recent_auth_required",
            message: "Recent authentication required",
          }),
          { status: 403, headers: { "Content-Type": "application/problem+json" } }
        )
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    const client = createApiClient({
      baseURL: "https://api.example.test",
      onRecentAuthRequired: async () => true,
    })
    await expect(client.post("/admin/action", {})).resolves.toEqual({ ok: true })

    expect(calls).toBe(2)
    expect(requestIds[0]).toBeTruthy()
    expect(requestIds[1]).toBe(requestIds[0])
  })

  test("does not prompt for step-up again after a failed retry", async () => {
    let calls = 0
    let prompts = 0
    globalThis.fetch = async () => {
      calls += 1
      return new Response(
        JSON.stringify({
          type: "https://arda.io.vn/problems/recent_auth_required",
          title: "Forbidden",
          status: 403,
          code: "recent_auth_required",
          message: "Recent authentication required",
        }),
        { status: 403, headers: { "Content-Type": "application/problem+json" } }
      )
    }

    const client = createApiClient({
      baseURL: "https://api.example.test",
      onRecentAuthRequired: async () => {
        prompts += 1
        return true
      },
    })
    const error = await client.post("/admin/action", {}).catch((reason) => reason)

    expect(error).toBeInstanceOf(ApiClientError)
    expect(calls).toBe(2)
    expect(prompts).toBe(1)
  })
})
