import { describe, expect, test } from "bun:test"
import { readChartTheme } from "./chart-theme"
import { WidgetSlotRegistry, sameChartTheme, shouldApplyHeight } from "./widget-frame-logic"
import { WIDGET_HEIGHT_MAX, WIDGET_HEIGHT_MIN } from "./widget-protocol"

describe("shouldApplyHeight", () => {
  test("skips moves under 2px and applies from 2px", () => {
    expect(shouldApplyHeight(300, 300)).toBe(false)
    expect(shouldApplyHeight(300, 301)).toBe(false)
    expect(shouldApplyHeight(300, 299)).toBe(false)
    expect(shouldApplyHeight(300, 302)).toBe(true)
    expect(shouldApplyHeight(300, 298)).toBe(true)
  })
  test("compares the clamped value, so out-of-range reports do not churn", () => {
    expect(shouldApplyHeight(WIDGET_HEIGHT_MAX, 5000)).toBe(false)
    expect(shouldApplyHeight(WIDGET_HEIGHT_MIN, 10)).toBe(false)
    expect(shouldApplyHeight(WIDGET_HEIGHT_MIN, 400)).toBe(true)
  })
})

describe("sameChartTheme", () => {
  test("compares by content, not identity", () => {
    expect(sameChartTheme(readChartTheme(() => ""), readChartTheme(() => ""))).toBe(true)
    const dark = readChartTheme((name) => (name === "--background" ? "#000" : ""))
    expect(sameChartTheme(readChartTheme(() => ""), dark)).toBe(false)
  })
})

describe("WidgetSlotRegistry", () => {
  test("acquiring beyond max collapses the oldest only", () => {
    const registry = new WidgetSlotRegistry(3)
    const collapsed: number[] = []
    for (let i = 1; i <= 4; i++) registry.acquire(() => collapsed.push(i))
    expect(collapsed).toEqual([1])
    expect(registry.size).toBe(3)
    registry.acquire(() => collapsed.push(5))
    expect(collapsed).toEqual([1, 2])
    expect(registry.size).toBe(3)
  })
  test("release removes the entry and frees a slot", () => {
    const registry = new WidgetSlotRegistry(2)
    const collapsed: number[] = []
    const releaseA = registry.acquire(() => collapsed.push(1))
    registry.acquire(() => collapsed.push(2))
    releaseA()
    expect(registry.size).toBe(1)
    registry.acquire(() => collapsed.push(3))
    expect(collapsed).toEqual([])
    expect(registry.size).toBe(2)
  })
  test("release is idempotent and a no-op after eviction", () => {
    const registry = new WidgetSlotRegistry(1)
    const collapsed: number[] = []
    const releaseA = registry.acquire(() => collapsed.push(1))
    registry.acquire(() => collapsed.push(2))
    expect(collapsed).toEqual([1])
    releaseA()
    releaseA()
    expect(registry.size).toBe(1)
  })
  test("StrictMode acquire/release/acquire does not double-register", () => {
    const registry = new WidgetSlotRegistry(3)
    const collapsed: string[] = []
    // Mount 4 frames, each effect then cleaned up and re-run.
    const names = ["a", "b", "c", "d"]
    let releases = names.map((n) => registry.acquire(() => collapsed.push(n)))
    releases.forEach((release) => release())
    expect(registry.size).toBe(0)
    releases = names.map((n) => registry.acquire(() => collapsed.push(n)))
    expect(registry.size).toBe(3)
    // Only the oldest is ever told to collapse; never b, c or d.
    expect(new Set(collapsed)).toEqual(new Set(["a"]))
    releases.forEach((release) => release())
    expect(registry.size).toBe(0)
  })
})
