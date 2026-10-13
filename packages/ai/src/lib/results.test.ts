import { describe, expect, test } from "bun:test"
import {
  artifactToolName,
  buildResultPath,
  isWidgetPayload,
  widgetViewKind,
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

describe("widgetViewKind", () => {
  const widget = { widget: true, title: "t", html: "<p>", js: "1", inputs_summary: "s" }
  test("a validated widget result renders the widget", () => {
    expect(widgetViewKind(widget, "complete")).toBe("widget")
  })
  test("a rejected call (error-shaped result) shows the generic view", () => {
    expect(widgetViewKind({ error: "ai.tool_invalid_arguments" }, "complete")).toBe("generic")
    expect(widgetViewKind({ ...widget, widget: false }, "complete")).toBe("generic")
    expect(widgetViewKind({ title: "t", html: "<p>", js: "1" }, "complete")).toBe("generic")
  })
  test("no result (dropped stream, flag off) renders nothing", () => {
    expect(widgetViewKind(undefined, "complete")).toBe("none")
    expect(widgetViewKind(null, "complete")).toBe("none")
  })
  test("running renders nothing, even with a widget-shaped result", () => {
    expect(widgetViewKind(undefined, "running")).toBe("none")
    expect(widgetViewKind(widget, "running")).toBe("none")
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
