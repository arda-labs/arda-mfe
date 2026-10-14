import { describe, expect, test } from "bun:test"
import { formatExact } from "./chart-card"

const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat("vi-VN", options).format(value)
const t = (key: string, params?: Record<string, string | number>) =>
  key === "ai.tool.kpi.amount" ? `${params?.value} VND` : key

describe("formatExact", () => {
  test("amounts print every digit with the unit, not billions/millions", () => {
    expect(formatExact(1_250_000_000, "amount", t, formatNumber)).toBe("1.250.000.000 VND")
    expect(formatExact(20_833_333.4, "amount", t, formatNumber)).toBe("20.833.333 VND")
  })

  test("other formats are unchanged", () => {
    expect(formatExact(12.345, "percent", t, formatNumber)).toBe("12,35%")
    expect(formatExact(1234, "int", t, formatNumber)).toBe("1.234")
  })
})
