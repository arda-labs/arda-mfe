import { describe, expect, test } from "bun:test"
import { hasCloudAck, setCloudAck } from "./cloud-ack"

describe("cloud acknowledgement", () => {
  test("never throws when sessionStorage is unavailable", () => {
    const saved = (globalThis as { sessionStorage?: unknown }).sessionStorage
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      get() {
        throw new Error("blocked")
      },
    })
    expect(() => setCloudAck()).not.toThrow()
    expect(hasCloudAck()).toBe(false)
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: saved })
  })

  test("round-trips when storage works", () => {
    const store = new Map<string, string>()
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
    })
    expect(hasCloudAck()).toBe(false)
    setCloudAck()
    expect(hasCloudAck()).toBe(true)
  })
})
