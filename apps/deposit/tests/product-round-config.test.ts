import { describe, expect, test } from "bun:test"
import {
  ROUND_TYPES,
  formatRoundNo,
  parseRoundNo,
  roundTypeLabelKey,
} from "../src/features/products/round-config"
import {
  buildProductSchema,
  productDefaultValues,
  toProductValues,
  toRequestBody,
} from "../src/features/products/schema"
import type { SavingsProduct } from "../src/features/api"

// The translator echoes the key so assertions can name the message that fired.
const schema = buildProductSchema((key) => key)

const valid = {
  code: "TK12",
  name: "Tiết kiệm 12 tháng",
  term_months: 12,
  interest_rate: 5.5,
  currency_code: "VND",
}

function issues(overrides: Record<string, unknown>) {
  const result = schema.safeParse({ ...valid, ...overrides })
  return result.success
    ? []
    : result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }))
}

describe("parseRoundNo", () => {
  test("empty means not configured", () => {
    expect(parseRoundNo("")).toEqual({ ok: true, value: null })
    expect(parseRoundNo("   ")).toEqual({ ok: true, value: null })
  })

  test("accepts non-negative integers, zero included", () => {
    expect(parseRoundNo("0")).toEqual({ ok: true, value: 0 })
    expect(parseRoundNo("1000")).toEqual({ ok: true, value: 1000 })
    expect(parseRoundNo(" 500 ")).toEqual({ ok: true, value: 500 })
  })

  test("reads vi-VN thousands grouping as the same integer", () => {
    expect(parseRoundNo("1.000")).toEqual({ ok: true, value: 1000 })
    expect(parseRoundNo("1.000.000")).toEqual({ ok: true, value: 1_000_000 })
    expect(parseRoundNo("1,000")).toEqual({ ok: true, value: 1000 })
    expect(parseRoundNo("1 000")).toEqual({ ok: true, value: 1000 })
  })

  test("rejects decimals, negatives, text and values beyond int32", () => {
    for (const raw of ["12.5", "1.00", "-5", "1e3", "abc", "10 0", "2147483648"]) {
      expect(parseRoundNo(raw)).toEqual({ ok: false })
    }
    expect(parseRoundNo("2147483647")).toEqual({ ok: true, value: 2147483647 })
  })
})

describe("round type labels", () => {
  test("every CM163 code has its own i18n key", () => {
    expect(ROUND_TYPES).toEqual(["CM163.001", "CM163.002", "CM163.003"])
    const keys = ROUND_TYPES.map((code) => roundTypeLabelKey(code))
    expect(new Set(keys).size).toBe(3)
    expect(keys.every((key) => key?.startsWith("deposit.products.round_type."))).toBe(true)
  })

  test("an unknown code has no key (the caller shows the raw code)", () => {
    expect(roundTypeLabelKey("HALF_UP")).toBeUndefined()
    expect(roundTypeLabelKey("")).toBeUndefined()
  })
})

describe("formatRoundNo", () => {
  test("groups thousands the vi-VN way and marks unset", () => {
    expect(formatRoundNo(1000)).toBe("1.000")
    expect(formatRoundNo(0)).toBe("0")
    expect(formatRoundNo(null)).toBe("")
    expect(formatRoundNo(undefined)).toBe("")
  })
})

describe("product form schema: rounding pair", () => {
  test("both empty is valid (not configured)", () => {
    expect(issues({ round_no: "", round_type: "" })).toEqual([])
  })

  test("both filled is valid, zero included", () => {
    expect(issues({ round_no: "1000", round_type: "CM163.001" })).toEqual([])
    expect(issues({ round_no: "0", round_type: "CM163.003" })).toEqual([])
    expect(issues({ round_no: "1.000", round_type: "CM163.002" })).toEqual([])
  })

  test("only round_no reports the missing type on round_type", () => {
    expect(issues({ round_no: "1000", round_type: "" })).toEqual([
      { path: "round_type", message: "deposit.products.validation.round_type_required" },
    ])
  })

  test("only round_type reports the missing step on round_no", () => {
    expect(issues({ round_no: "", round_type: "CM163.001" })).toEqual([
      { path: "round_no", message: "deposit.products.validation.round_no_required" },
    ])
  })

  test("a malformed step reports round_no_invalid", () => {
    for (const round_no of ["12.5", "-1", "abc"]) {
      expect(issues({ round_no, round_type: "CM163.001" })).toEqual([
        { path: "round_no", message: "deposit.products.validation.round_no_invalid" },
      ])
    }
  })

  test("a type outside CM163.001/.002/.003 is rejected", () => {
    expect(issues({ round_no: "1000", round_type: "HALF_UP" })).toEqual([
      { path: "round_type", message: "deposit.products.validation.round_type_invalid" },
    ])
  })

  test("a blank step with a bad type reports both problems", () => {
    expect(issues({ round_no: "x", round_type: "HALF_UP" }).map((i) => i.path).sort()).toEqual([
      "round_no",
      "round_type",
    ])
  })
})

describe("form values", () => {
  test("a new product starts with no rounding (no default)", () => {
    expect(productDefaultValues.round_no).toBe("")
    expect(productDefaultValues.round_type).toBe("")
  })

  test("editing preloads the configured pair, zero included", () => {
    const product = {
      code: "TK12",
      name: "Tiết kiệm 12 tháng",
      term_months: 12,
      interest_rate: 5.5,
      currency_code: "VND",
      round_no: 0,
      round_type: "CM163.002",
    } as SavingsProduct
    const values = toProductValues(product)
    expect(values.round_no).toBe("0")
    expect(values.round_type).toBe("CM163.002")
  })

  test("editing a product without rounding preloads empty fields", () => {
    const product = { code: "TK6", name: "x", term_months: 6, interest_rate: 4, currency_code: "VND" } as SavingsProduct
    const values = toProductValues({ ...product, round_no: null, round_type: null })
    expect(values.round_no).toBe("")
    expect(values.round_type).toBe("")
    expect(toProductValues(product).round_no).toBe("")
  })
})

describe("request body", () => {
  const base = { ...valid, round_no: "", round_type: "" }

  test("omits both fields when nothing is configured", () => {
    const body = toRequestBody(base)
    expect(body).toEqual({
      product_code: "TK12",
      name: "Tiết kiệm 12 tháng",
      term_months: 12,
      interest_rate: 5.5,
      currency_code: "VND",
    })
    expect("round_no" in body).toBe(false)
    expect("round_type" in body).toBe(false)
  })

  test("sends the pair as an integer and a CM163 code", () => {
    expect(toRequestBody({ ...base, round_no: "1.000", round_type: "CM163.001" })).toMatchObject({
      round_no: 1000,
      round_type: "CM163.001",
    })
  })

  test("round_no 0 is sent, not dropped as empty", () => {
    const body = toRequestBody({ ...base, round_no: "0", round_type: "CM163.003" })
    expect(body.round_no).toBe(0)
    expect(body.round_type).toBe("CM163.003")
  })

  test("normalizes code, name and currency", () => {
    expect(
      toRequestBody({ ...base, code: " TK12 ", name: " Tiết kiệm ", currency_code: "vnd" })
    ).toMatchObject({ product_code: "TK12", name: "Tiết kiệm", currency_code: "VND" })
  })
})
