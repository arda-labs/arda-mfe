import { describe, expect, test } from "bun:test"
import { WIDGET_KIT } from "./widget-kit"

type Kit = {
  fmt: (value: unknown, format?: string) => string
  num: (value: unknown, fallback?: number) => number
  val: (id: string, fallback?: number) => number
  chartSvg: (spec: unknown, width?: number) => string
  table: (id: string, spec: unknown) => void
}

type FakeNode = { value?: string; min?: string; max?: string; innerHTML?: string }

function loadKit(nodes: Record<string, FakeNode> = {}): Kit {
  const win: { arda?: Kit } = {}
  const doc = { getElementById: (id: string) => nodes[id] ?? null, addEventListener: () => {} }
  new Function("window", "document", WIDGET_KIT)(win, doc)
  return win.arda as Kit
}

const kit = loadKit()

describe("widget kit inlining", () => {
  test("is safe to place in an unescaped inline script", () => {
    expect(WIDGET_KIT).not.toMatch(/<\/script/i)
    expect(WIDGET_KIT).not.toContain("<!--")
    expect(WIDGET_KIT).not.toContain("`")
  })

  test("adds no arda: message literals", () => {
    expect(WIDGET_KIT).not.toMatch(/"arda:[a-z]+"/)
  })
})

describe("fmt", () => {
  test("formats amounts the way ChartView does", () => {
    expect(kit.fmt(1_250_000_000, "amount")).toBe("1,25 tỷ")
    expect(kit.fmt(3_400_000, "amount")).toBe("3,4 triệu")
    expect(kit.fmt(950_000, "amount")).toBe("950.000")
    expect(kit.fmt(12.345, "percent")).toBe("12,35%")
    expect(kit.fmt(1234567, "int")).toBe("1.234.567")
  })

  test("never prints NaN or Infinity", () => {
    for (const bad of [NaN, Infinity, undefined, null, "abc", {}]) {
      expect(kit.fmt(bad, "amount")).toBe("—")
    }
  })
})

describe("num and val", () => {
  test("num falls back on anything non-finite", () => {
    expect(kit.num("12.5")).toBe(12.5)
    expect(kit.num("", 7)).toBe(7)
    expect(kit.num("x", 7)).toBe(7)
    expect(kit.num(undefined)).toBe(0)
  })

  test("val clamps to the input's min/max and survives a missing element", () => {
    const k = loadKit({
      rate: { value: "40", min: "5", max: "15" },
      empty: { value: "", min: "", max: "" },
    })
    expect(k.val("rate")).toBe(15)
    expect(k.val("empty", 9)).toBe(9)
    expect(k.val("missing", 3)).toBe(3)
  })
})

describe("chartSvg", () => {
  const spec = {
    type: "bar",
    categories: ["T1", "T2", "T3"],
    series: [
      { name: "Gốc", values: [100_000_000, 120_000_000, 90_000_000] },
      { name: "Lãi", values: [8_000_000, 7_000_000, null] },
    ],
    format: "amount",
  }

  test.each(["bar", "stacked", "line", "area", "donut"])("%s renders an SVG without NaN", (type) => {
    const svg = kit.chartSvg({ ...spec, type }, 480)
    expect(svg.startsWith("<svg")).toBe(true)
    expect(svg.endsWith("</svg>")).toBe(true)
    expect(svg).not.toMatch(/NaN|Infinity|undefined/)
  })

  test("grouped bar draws one bar per value and a legend for two series", () => {
    const svg = kit.chartSvg(spec, 480)
    const bars = svg.match(/<rect [^>]*rx="2"/g) ?? []
    // 6 bars + 2 legend swatches
    expect(bars.length).toBe(8)
    expect(svg).toContain(">Gốc<")
  })

  test("axis ticks are round numbers and start at zero for positive data", () => {
    const svg = kit.chartSvg({ type: "bar", categories: ["a", "b"], series: [{ name: "x", values: [3, 47] }] }, 400)
    const labels = [...svg.matchAll(/text-anchor="end"[^>]*>([^<]+)</g)].map((m) => m[1])
    expect(labels[0]).toBe("0")
    expect(labels.at(-1)).toBe("50")
  })

  test("escapes category and series names", () => {
    const svg = kit.chartSvg(
      { type: "line", categories: ["<img src=x>"], series: [{ name: "a\"b", values: [1] }, { name: "c", values: [2] }] },
      400
    )
    expect(svg).not.toContain("<img")
    expect(svg).toContain("&lt;img src=x&gt;")
    expect(svg).toContain("a&quot;b")
  })

  test("empty or malformed specs still render", () => {
    for (const bad of [undefined, {}, { type: "bar", categories: ["a"], series: [{}] }, { type: "donut", categories: [], series: [] }]) {
      const svg = kit.chartSvg(bad, 300)
      expect(svg).toContain("</svg>")
      expect(svg).not.toMatch(/NaN|Infinity/)
    }
  })

  test("all-negative data puts zero at the top of the axis", () => {
    const svg = kit.chartSvg({ type: "bar", categories: ["a", "b"], series: [{ name: "x", values: [-3, -8] }] }, 400)
    const labels = [...svg.matchAll(/text-anchor="end"[^>]*>([^<]+)</g)].map((m) => m[1])
    expect(labels.at(-1)).toBe("0")
  })
})

describe("table", () => {
  test("formats cells and escapes text", () => {
    const node: FakeNode = {}
    const k = loadKit({ out: node })
    k.table("out", {
      columns: [{ key: "k", label: "Kỳ" }, { key: "v", label: "Số tiền", format: "amount" }],
      rows: [{ k: "<b>1</b>", v: 2_000_000 }],
    })
    expect(node.innerHTML).toContain("&lt;b&gt;1&lt;/b&gt;")
    expect(node.innerHTML).toContain("2 triệu")
  })
})
