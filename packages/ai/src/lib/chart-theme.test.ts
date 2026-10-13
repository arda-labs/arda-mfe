import { describe, expect, test } from "bun:test"
import { CHART_FALLBACK_PALETTE, readChartTheme } from "./chart-theme"

function styleOf(vars: Record<string, string>) {
  return (name: string) => vars[name] ?? ""
}

describe("readChartTheme", () => {
  test("reads --chart-1..10 in order", () => {
    const vars: Record<string, string> = {}
    for (let i = 1; i <= 10; i++) vars[`--chart-${i}`] = ` oklch(0.5 0.1 ${i * 30}) `
    const theme = readChartTheme(styleOf(vars))
    expect(theme.palette).toHaveLength(10)
    expect(theme.palette[0]).toBe("oklch(0.5 0.1 30)")
    expect(theme.palette[9]).toBe("oklch(0.5 0.1 300)")
  })

  test("falls back per slot when a token is missing", () => {
    const theme = readChartTheme(styleOf({ "--chart-1": "red" }))
    expect(theme.palette[0]).toBe("red")
    expect(theme.palette[1]).toBe(CHART_FALLBACK_PALETTE[1])
    expect(theme.palette).toHaveLength(CHART_FALLBACK_PALETTE.length)
  })

  test("reads surface tokens with fallbacks", () => {
    const theme = readChartTheme(styleOf({ "--card": "black", "--muted-foreground": "gray" }))
    expect(theme.card).toBe("black")
    expect(theme.mutedForeground).toBe("gray")
    expect(theme.border).toBeTruthy()
  })

  test("returns pure fallback when nothing is resolvable", () => {
    const theme = readChartTheme(() => "")
    expect(theme.palette).toEqual(CHART_FALLBACK_PALETTE)
    expect(theme.card).toBe("#ffffff")
    expect(theme.background).toBe("#ffffff")
  })
})
