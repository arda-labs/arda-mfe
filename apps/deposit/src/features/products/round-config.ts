// Rounding of the cumulative daily accrual of a deposit product
// (arda-be dpm_products.round_no / round_type, EPAS ROUND_NO / CM163).
// Framework-free: no React, no i18n lookups (feature-structure R4).

/** CM163.001 HALF_UP, CM163.002 CEILING, CM163.003 FLOOR. */
export const ROUND_TYPES = ["CM163.001", "CM163.002", "CM163.003"] as const
export type RoundType = (typeof ROUND_TYPES)[number]

const ROUND_TYPE_LABEL_KEYS: Record<RoundType, string> = {
  "CM163.001": "deposit.products.round_type.cm163_001",
  "CM163.002": "deposit.products.round_type.cm163_002",
  "CM163.003": "deposit.products.round_type.cm163_003",
}

export function isRoundType(value: string): value is RoundType {
  return (ROUND_TYPES as readonly string[]).includes(value)
}

/** i18n key of the plain-language name of a CM163 code, undefined if unknown. */
export function roundTypeLabelKey(code: string | null | undefined): string | undefined {
  return code && isRoundType(code) ? ROUND_TYPE_LABEL_KEYS[code] : undefined
}

const INT32_MAX = 2_147_483_647
const GROUPED_INTEGER = /^\d{1,3}([.,\s]\d{3})+$/
const PLAIN_INTEGER = /^\d+$/

export type ParsedRoundNo = { ok: true; value: number | null } | { ok: false }

/**
 * Reads the step typed by the user. Empty is "not configured" (null). Zero is a
 * real value (round once to the dong). Only non-negative integers fit the
 * column: a vi-VN grouped "1.000" is the integer 1000, never the decimal 1.
 */
export function parseRoundNo(raw: string): ParsedRoundNo {
  const text = raw.trim()
  if (text === "") return { ok: true, value: null }
  let digits: string
  if (PLAIN_INTEGER.test(text)) digits = text
  else if (GROUPED_INTEGER.test(text)) digits = text.replace(/[.,\s]/g, "")
  else return { ok: false }
  const value = Number(digits)
  return Number.isSafeInteger(value) && value <= INT32_MAX
    ? { ok: true, value }
    : { ok: false }
}

/** Display form of a step: "1.000"; empty when not configured. */
export function formatRoundNo(value: number | null | undefined, locale = "vi-VN"): string {
  return value == null ? "" : new Intl.NumberFormat(locale).format(value)
}
