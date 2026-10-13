import { describe, expect, test } from "bun:test"
import { CHART_FALLBACK_PALETTE, readChartTheme } from "./chart-theme"
import { WIDGET_CSP, buildWidgetDocument, escapeInlineScript, escapeInlineStyle } from "./widget-host"

const theme = readChartTheme(() => "")

const TOKEN_NAMES = [
  ...Array.from({ length: 10 }, (_, i) => `chart-${i + 1}`),
  "background",
  "foreground",
  "card",
  "border",
  "primary",
  "primary-foreground",
  "muted-foreground",
  "radius",
]

function runtimeOf(doc: string): string {
  return doc.slice(doc.indexOf("<script>"), doc.indexOf("</script>"))
}

type Message = { type: string; [key: string]: unknown }
type Event = { type: string; message?: string; data?: unknown; source?: unknown }

// Runs the built document's two inline scripts (runtime, then the model
// wrapper) against a minimal fake window. This checks behaviour without a DOM.
// `size.height` stands in for document.body.getBoundingClientRect().height and
// can be changed between calls to simulate content shrinking.
function runDocument(
  doc: string,
  size: { height: number },
  options: { readyState?: string; ResizeObserver?: unknown } = {},
) {
  const posted: Message[] = []
  const listeners: Record<string, Array<(event: Event) => void>> = {}
  const documentListeners: Record<string, Array<(event: Event) => void>> = {}
  const parent = { postMessage: (msg: Message) => void posted.push(msg) }
  const win = {
    parent,
    addEventListener: (type: string, fn: (event: Event) => void) => {
      ;(listeners[type] ??= []).push(fn)
    },
    dispatchEvent: (event: Event) => {
      for (const fn of listeners[event.type] ?? []) fn(event)
      return true
    },
  }
  const bodyElement = { getBoundingClientRect: () => ({ height: size.height }) }
  // The runtime is parsed in <head>: the body does not exist yet and the
  // document is still loading. The body appears before the model script runs.
  const fakeDocument: { documentElement: unknown; body: unknown; readyState: string; addEventListener: unknown } = {
    // Must not be used: the runtime measures the body box.
    documentElement: { scrollHeight: 9999 },
    body: null,
    readyState: options.readyState ?? "loading",
    addEventListener: (type: string, fn: (event: Event) => void) => {
      ;(documentListeners[type] ??= []).push(fn)
    },
  }
  const CustomEvent = function (type: string) {
    return { type }
  }
  const ErrorEvent = function (type: string, init: { message: string }) {
    return { type, message: init.message }
  }
  const scripts = [...doc.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
  scripts.forEach((code, index) => {
    if (index > 0) fakeDocument.body = bodyElement
    const run = new Function("window", "document", "CustomEvent", "ErrorEvent", "ResizeObserver", code)
    run(win, fakeDocument, CustomEvent, ErrorEvent, options.ResizeObserver)
  })
  const send = (data: unknown) => {
    for (const fn of listeners.message ?? []) fn({ type: "message", source: parent, data })
  }
  const load = () => {
    for (const fn of listeners.load ?? []) fn({ type: "load" })
  }
  const domContentLoaded = () => {
    fakeDocument.body = bodyElement
    for (const fn of documentListeners.DOMContentLoaded ?? []) fn({ type: "DOMContentLoaded" })
  }
  return { posted, send, load, listeners, documentListeners, domContentLoaded, bodyElement }
}

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

  test("injects every theme token by its canonical name", () => {
    const doc = buildWidgetDocument({ html: "", js: "1", theme: { ...theme, card: "oklch(0.2 0 0)" } })
    expect(doc).toContain("--card: oklch(0.2 0 0);")
    expect(doc).toContain(`--chart-1: ${CHART_FALLBACK_PALETTE[0]};`)
    expect(doc).toContain(`--chart-10: ${CHART_FALLBACK_PALETTE[9]};`)
    for (const name of TOKEN_NAMES) {
      expect(doc).toContain(`--${name}:`)
    }
  })

  test("escapes closing tags inside model code (Review Focus 1)", () => {
    expect(escapeInlineScript("a</script>b</SCRIPT>")).toBe("a<\\/script>b<\\/SCRIPT>")
    expect(escapeInlineStyle("a</style>b")).toBe("a<\\/style>b")
    const doc = buildWidgetDocument({ html: "", js: "const s = '</script>'", theme })
    // Only the runtime script and the model script close a <script>.
    expect((doc.match(/<\/script>/g) ?? []).length).toBe(2)
  })

  test("mixed-case and malformed closers in model JS cannot end the script element", () => {
    const js = `window.parent.postMessage({ type: "probe", a: "</SCRIPT >", b: "</script/" }, "*")`
    const doc = buildWidgetDocument({ html: "", js, theme })
    expect((doc.match(/<\/script/gi) ?? []).length).toBe(2)
    const { posted } = runDocument(doc, { height: 10 })
    expect(posted).toContainEqual({ type: "probe", a: "</SCRIPT >", b: "</script/" })
  })

  test("<!-- in model JS and CSS is escaped so the closing tag survives", () => {
    expect(escapeInlineScript("x<!-- <script>y")).toBe("x<\\!-- <script>y")
    expect(escapeInlineStyle("a<!--b")).toBe("a<\\!--b")

    const js = `window.parent.postMessage({ type: "probe", c: "<!-- <script" }, "*")`
    const doc = buildWidgetDocument({ html: "", css: "/* <!-- <script */", js, theme })
    const modelScript = [...doc.matchAll(/<script>([\s\S]*?)<\/script>/g)][1][1]
    expect(modelScript).not.toContain("<!--")
    expect((doc.match(/<\/script>/g) ?? []).length).toBe(2)
    const { posted } = runDocument(doc, { height: 10 })
    expect(posted).toContainEqual({ type: "probe", c: "<!-- <script" })
  })

  test("model CSS containing </style cannot close the style element", () => {
    const doc = buildWidgetDocument({ html: "", css: "a{}</style><p>x", js: "1", theme })
    expect((doc.match(/<\/style>/g) ?? []).length).toBe(2)
    expect(doc).not.toContain("</style><p>x")
  })

  test("theme values containing </style cannot close the style element", () => {
    const doc = buildWidgetDocument({ html: "", js: "1", theme: { ...theme, card: "red</style><b>" } })
    expect((doc.match(/<\/style>/g) ?? []).length).toBe(2)
  })

  test("height is measured from the body box, so it can shrink", () => {
    const doc = buildWidgetDocument({ html: "", js: "1", theme })
    const runtime = runtimeOf(doc)
    expect(runtime).toContain("document.body.getBoundingClientRect()")
    expect(runtime).toContain("observe(document.body)")
    expect(runtime).not.toContain("documentElement")
    expect(runtime).not.toContain("scrollHeight")

    const size = { height: 57.2 }
    const { posted, send, load } = runDocument(doc, size)
    load()
    size.height = 20
    send({ type: "arda:data", data: {} })
    expect(posted.filter((m) => m.type === "arda:height").map((m) => m.height)).toEqual([58, 20])
  })

  test("runtime parsed before <body> does not throw and defers observation to DOMContentLoaded", () => {
    const doc = buildWidgetDocument({ html: "", js: "1", theme })
    const observed: unknown[] = []
    const FakeObserver = function () {
      return { observe: (el: unknown) => void observed.push(el) }
    }
    // runDocument evaluates the runtime with document.body === null and readyState "loading".
    let result!: ReturnType<typeof runDocument>
    expect(() => {
      result = runDocument(doc, { height: 10 }, { ResizeObserver: FakeObserver })
    }).not.toThrow()
    for (const type of ["message", "error", "unhandledrejection", "load"]) {
      expect(result.listeners[type]?.length).toBe(1)
    }
    expect(result.documentListeners.DOMContentLoaded?.length).toBe(1)
    expect(result.posted.filter((m) => m.type === "arda:error")).toEqual([])
    expect(observed).toEqual([])
    result.domContentLoaded()
    expect(observed).toEqual([result.bodyElement])
  })

  test("a missing body or a missing ResizeObserver is tolerated without arda:error", () => {
    const doc = buildWidgetDocument({ html: "", js: "1", theme })
    const seen: unknown[] = []
    const Observer = function (this: unknown) {
      return { observe: (el: unknown) => void seen.push(el) }
    }
    // body is null while the runtime runs, so even a non-loading document must not observe or throw.
    expect(() => runDocument(doc, { height: 10 }, { readyState: "complete", ResizeObserver: Observer })).not.toThrow()
    expect(seen).toEqual([])
    const none = runDocument(doc, { height: 10 }, { ResizeObserver: undefined })
    none.domContentLoaded()
    expect(none.posted.filter((m) => m.type === "arda:error")).toEqual([])
  })

  test("runtime posts only arda:height and arda:error; arda:data is the one inbound type", () => {
    const doc = buildWidgetDocument({ html: "", js: "1", theme })
    const literals = [...new Set(runtimeOf(doc).match(/"arda:[a-z]+"/g))].sort()
    expect(literals).toEqual(['"arda:data"', '"arda:error"', '"arda:height"'])
  })

  test("a thrown model error reaches the parent as arda:error via the runtime path", () => {
    const doc = buildWidgetDocument({ html: "", js: 'throw new Error("boom")', theme })
    const { posted } = runDocument(doc, { height: 10 })
    expect(posted).toContainEqual({ type: "arda:error", message: "boom" })
  })

  test("arda:error text is capped at 500 characters", () => {
    const doc = buildWidgetDocument({ html: "", js: `throw new Error("x".repeat(900))`, theme })
    const { posted } = runDocument(doc, { height: 10 })
    const error = posted.find((m) => m.type === "arda:error")
    expect(String(error?.message).length).toBe(500)
  })
})
