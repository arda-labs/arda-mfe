import { describe, expect, test } from "bun:test"
import { caretAfterReformat, formatMoneyText, parseMoneyText } from "./money-text"

describe("parseMoneyText", () => {
  test("groups thousands with dots and hands back a plain number", () => {
    expect(parseMoneyText("1250000", 0)).toEqual({ display: "1.250.000", canonical: "1250000" })
    expect(parseMoneyText("1.250.0001", 0)).toEqual({ display: "12.500.001", canonical: "12500001" })
  })

  test("decimal comma only when the currency has decimals", () => {
    expect(parseMoneyText("1234,567", 2)).toEqual({ display: "1.234,56", canonical: "1234.56" })
    expect(parseMoneyText("1234,", 2)).toEqual({ display: "1.234,", canonical: "1234" })
    expect(parseMoneyText("1234,5", 0)).toEqual({ display: "12.345", canonical: "12345" })
  })

  test("drops junk, leading zeros and a minus unless negatives are allowed", () => {
    expect(parseMoneyText("abc", 0)).toEqual({ display: "", canonical: "" })
    expect(parseMoneyText("007", 0)).toEqual({ display: "7", canonical: "7" })
    expect(parseMoneyText("-500", 0)).toEqual({ display: "500", canonical: "500" })
    expect(parseMoneyText("-500", 0, true)).toEqual({ display: "-500", canonical: "-500" })
    expect(parseMoneyText("-", 0, true)).toEqual({ display: "-", canonical: "" })
  })
})

describe("formatMoneyText", () => {
  test("canonical values and numbers render grouped", () => {
    expect(formatMoneyText("1250000", 0)).toBe("1.250.000")
    expect(formatMoneyText(1234.5, 2)).toBe("1.234,5")
    expect(formatMoneyText("-9000", 0)).toBe("-9.000")
    expect(formatMoneyText("", 0)).toBe("")
    expect(formatMoneyText("not a number", 0)).toBe("")
  })
})

describe("caretAfterReformat", () => {
  test("keeps the caret after the same digits once dots move", () => {
    // "1234|" -> "1.234|"
    expect(caretAfterReformat("1234", 4, "1.234")).toBe(5)
    // "12|345" typed into "1.2345" -> display "12.345", caret after "12"
    expect(caretAfterReformat("1.2345", 3, "12.345")).toBe(2)
    expect(caretAfterReformat("5", 0, "5")).toBe(0)
  })
})
