import { afterEach, describe, expect, test } from "bun:test"
import { ApiClientError, createApiClient } from "./client"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe("createApiClient GET lifecycle", () => {
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

  test("normalizes typed backend errors", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "validation.invalid_input",
            message: "Invalid filter",
            fields: { q: "too long" },
            request_id: "req-test",
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )

    const client = createApiClient({ baseURL: "https://api.example.test" })
    const error = await client.get("/items").catch((reason) => reason)

    expect(error).toBeInstanceOf(ApiClientError)
    expect(error).toMatchObject({
      code: "validation.invalid_input",
      status: 400,
      fields: { q: "too long" },
      requestId: "req-test",
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
})
