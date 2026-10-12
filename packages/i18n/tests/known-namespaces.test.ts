import { describe, expect, test } from "bun:test"
import { registerAppLocales, translateApiError } from "../src/index"

describe("namespace shorthand", () => {
  test("resolves <ns>.<key> once the namespace is registered", () => {
    expect(translateApiError({ code: "demo_remote.greeting" })).toBe("demo_remote.greeting")
    registerAppLocales("demo_remote", {
      "vi-VN": { greeting: "Xin chào" },
      "en-US": { greeting: "Hello" },
    })
    expect(translateApiError({ code: "demo_remote.greeting" })).toBe("Xin chào")
  })

  test("core namespaces are known from the start", () => {
    // Only the shorthand step resolves "admin.title" to admin:title; the
    // common fallback would return the key unchanged.
    expect(translateApiError({ code: "admin.title" })).toBe("Quản trị")
  })
})
