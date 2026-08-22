import { afterEach, describe, expect, test } from "bun:test"
import { createApiClient } from "./client"

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
})
