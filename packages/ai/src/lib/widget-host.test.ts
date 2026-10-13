import { describe, expect, test } from "bun:test"
import { CHART_FALLBACK_PALETTE, readChartTheme } from "./chart-theme"
import { WIDGET_CSP, buildWidgetDocument, escapeInlineScript, escapeInlineStyle } from "./widget-host"

const theme = readChartTheme(() => "")

describe("buildWidgetDocument", () => {
  test("CSP meta is the second element of head, before any script", () => {
    const doc = buildWidgetDocument({ html: "<p>a</p>", js: "1", theme })
    const head = doc.slice(doc.indexOf("<head>"), doc.indexOf("</head>"))
    const metas = [...head.matchAll(/<meta[^>]*>/g)].map((m) => m[0])
    expect(metas[0]).toContain('charset="utf-8"')
    expect(metas[1]).toContain("Content-Security-Policy")
    expect(metas[1]).toContain(WIDGET_CSP)
    expect(head.indexOf("<meta http-equiv")).toBeLessThan(head.indexOf("<script"))
  })

  test("runtime script precedes model code and model code is placed in body", () => {
    const doc = buildWidgetDocument({ html: "<p id=x>a</p>", css: "#x{color:red}", js: "MODEL_JS_MARKER", theme })
    expect(doc.indexOf("arda:data")).toBeLessThan(doc.indexOf("MODEL_JS_MARKER"))
    const body = doc.slice(doc.indexOf("<body>"), doc.indexOf("</body>"))
    expect(body).toContain("<p id=x>a</p>")
    expect(body).toContain("#x{color:red}")
    expect(body).toContain("MODEL_JS_MARKER")
  })

  test("injects theme tokens by their canonical names", () => {
    const doc = buildWidgetDocument({ html: "", js: "1", theme: { ...theme, card: "oklch(0.2 0 0)" } })
    expect(doc).toContain("--card: oklch(0.2 0 0);")
    expect(doc).toContain(`--chart-1: ${CHART_FALLBACK_PALETTE[0]};`)
    expect(doc).toContain(`--chart-10: ${CHART_FALLBACK_PALETTE[9]};`)
    expect(doc).toContain("--radius:")
  })

  test("escapes closing tags inside model code (Review Focus 1)", () => {
    expect(escapeInlineScript("a</script>b</SCRIPT>")).toBe("a<\\/script>b<\\/SCRIPT>")
    expect(escapeInlineStyle("a</style>b")).toBe("a<\\/style>b")
    const doc = buildWidgetDocument({ html: "", js: "const s = '</script>'", theme })
    // Only the runtime script and the model script close a <script>.
    expect((doc.match(/<\/script>/g) ?? []).length).toBe(2)
  })

  test("runtime never exposes a free-text channel to the parent", () => {
    const doc = buildWidgetDocument({ html: "", js: "1", theme })
    const runtime = doc.slice(doc.indexOf("<script>"), doc.indexOf("</script>"))
    expect(runtime).toContain('"arda:height"')
    expect(runtime).toContain('"arda:error"')
    expect(runtime).not.toContain("arda:suggest")
    expect(runtime).not.toContain("arda:ask")
  })
})
