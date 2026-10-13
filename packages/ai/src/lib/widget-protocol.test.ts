import { describe, expect, test } from "bun:test"
import { WIDGET_HEIGHT_MAX, WIDGET_HEIGHT_MIN, clampWidgetHeight, parseWidgetMessage } from "./widget-protocol"

describe("parseWidgetMessage", () => {
  test("accepts height as a finite non-negative number", () => {
    expect(parseWidgetMessage({ type: "arda:height", height: 300 })).toEqual({ type: "arda:height", height: 300 })
  })
  test("rejects malformed height (Review Focus 2)", () => {
    expect(parseWidgetMessage({ type: "arda:height", height: "300" })).toBeNull()
    expect(parseWidgetMessage({ type: "arda:height", height: Number.NaN })).toBeNull()
    expect(parseWidgetMessage({ type: "arda:height", height: -5 })).toBeNull()
  })
  test("truncates error messages to 500 chars", () => {
    const parsed = parseWidgetMessage({ type: "arda:error", message: "x".repeat(900) })
    expect(parsed?.type).toBe("arda:error")
    expect((parsed as { message: string }).message).toHaveLength(500)
  })
  test("ignores unknown or non-object messages", () => {
    expect(parseWidgetMessage({ type: "arda:suggest", text: "hi" })).toBeNull()
    expect(parseWidgetMessage("arda:height")).toBeNull()
    expect(parseWidgetMessage(null)).toBeNull()
  })

  test("rejects infinite heights", () => {
    expect(parseWidgetMessage({ type: "arda:height", height: Number.POSITIVE_INFINITY })).toBeNull()
    expect(parseWidgetMessage({ type: "arda:height", height: Number.NEGATIVE_INFINITY })).toBeNull()
  })
  test("accepts height 0 and returns 0", () => {
    expect(parseWidgetMessage({ type: "arda:height", height: 0 })).toEqual({ type: "arda:height", height: 0 })
  })
  test("ignores arrays even when they carry a type property", () => {
    const arr = Object.assign([], { type: "arda:height", height: 300 })
    expect(parseWidgetMessage(arr)).toBeNull()
    expect(parseWidgetMessage([])).toBeNull()
  })
  test("arda:error with a non-string message uses fixed text and never calls toString", () => {
    let called = false
    const trap = {
      toString() {
        called = true
        return "attacker"
      },
    }
    expect(parseWidgetMessage({ type: "arda:error", message: trap })).toEqual({ type: "arda:error", message: "error" })
    expect(called).toBe(false)
    expect(parseWidgetMessage({ type: "arda:error", message: 42 })).toEqual({ type: "arda:error", message: "error" })
    expect(parseWidgetMessage({ type: "arda:error" })).toEqual({ type: "arda:error", message: "error" })
  })
  test("arda:error returns only type and message", () => {
    expect(parseWidgetMessage({ type: "arda:error", message: "boom", extra: 1 })).toEqual({
      type: "arda:error",
      message: "boom",
    })
  })
})

describe("clampWidgetHeight", () => {
  test("clamps into [min, max]", () => {
    expect(clampWidgetHeight(10)).toBe(WIDGET_HEIGHT_MIN)
    expect(clampWidgetHeight(5000)).toBe(WIDGET_HEIGHT_MAX)
    expect(clampWidgetHeight(400)).toBe(400)
  })
  test("keeps the bounds themselves and rounds fractional heights", () => {
    expect(clampWidgetHeight(WIDGET_HEIGHT_MIN)).toBe(WIDGET_HEIGHT_MIN)
    expect(clampWidgetHeight(WIDGET_HEIGHT_MAX)).toBe(WIDGET_HEIGHT_MAX)
    expect(clampWidgetHeight(400.6)).toBe(401)
  })
})
