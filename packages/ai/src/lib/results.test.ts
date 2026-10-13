import { describe, expect, test } from "bun:test"
import {
  artifactToolName,
  buildResultPath,
  isWidgetPayload,
  widgetPayloadFromArgs,
} from "./results"

describe("buildResultPath", () => {
  test("percent-encodes real sandbox ids (contain | and :)", () => {
    expect(buildResultPath("t1|u1|th-9:1f", "th 9")).toBe(
      "/api/ai/results/t1%7Cu1%7Cth-9%3A1f?thread_id=th%209"
    )
  })
  test("rejects empty and oversized ids", () => {
    expect(() => buildResultPath("", "t")).toThrow()
    expect(() => buildResultPath("x".repeat(513), "t")).toThrow()
  })
  test("accepts an id of exactly 512 chars", () => {
    expect(() => buildResultPath("x".repeat(512), "t")).not.toThrow()
  })
})

describe("widgetPayloadFromArgs", () => {
  test("accepts complete args and adds the marker", () => {
    const p = widgetPayloadFromArgs({
      title: "t",
      html: "<p>",
      js: "1",
      inputs_summary: "s",
      data: { a: 1 },
    })
    expect(p?.widget).toBe(true)
    expect(p?.data).toEqual({ a: 1 })
  })
  test("rejects partial args (streaming) and non-objects", () => {
    expect(widgetPayloadFromArgs({ title: "t", html: "<p>" })).toBeNull()
    expect(widgetPayloadFromArgs(undefined)).toBeNull()
    expect(widgetPayloadFromArgs("x")).toBeNull()
    expect(widgetPayloadFromArgs(null)).toBeNull()
  })
})

describe("isWidgetPayload", () => {
  test("requires widget marker, html, js, title, inputs_summary", () => {
    expect(
      isWidgetPayload({ widget: true, title: "t", html: "<p>", js: "1", inputs_summary: "s" })
    ).toBe(true)
    expect(isWidgetPayload({ widget: true, title: "t", js: "1", inputs_summary: "s" })).toBe(false)
    expect(isWidgetPayload({ title: "t", html: "<p>", js: "1", inputs_summary: "s" })).toBe(false)
    expect(
      isWidgetPayload({ widget: "true", title: "t", html: "<p>", js: "1", inputs_summary: "s" })
    ).toBe(false)
  })
})

describe("artifactToolName", () => {
  const widget = { widget: true, title: "t", html: "<p>", js: "1", inputs_summary: "s" }
  test("widget payload replays as renderWidget", () => {
    expect(artifactToolName(widget)).toBe("renderWidget")
  })
  test("chart payload, null, string and widget:false replay as renderChart", () => {
    expect(artifactToolName({ chart: { type: "bar" } })).toBe("renderChart")
    expect(artifactToolName(null)).toBe("renderChart")
    expect(artifactToolName("x")).toBe("renderChart")
    expect(artifactToolName({ ...widget, widget: false })).toBe("renderChart")
  })
})
