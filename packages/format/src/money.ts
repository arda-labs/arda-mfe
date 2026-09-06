/**
 * Currency-aware money formatting — the single standard for displaying
 * amounts across remotes. Never inline `new Intl.NumberFormat(...)` in
 * pages: currency exponent and grouping rules live here.
 *
 * Conventions (Arda):
 * - VND: 0 decimal places (₫ suffix, e.g. "1.250.000 ₫")
 * - USD/EUR/GBP: 2 decimal places, currency code suffix
 * - Raw backend numbers are plain JS numbers (minor formatting only);
 *   no floating-point math may be done with the results of these helpers.
 */

export type CurrencyCode = "VND" | "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "AUD" | "SGD" | "THB" | "KRW" | "CHF"

const ZERO_DECIMAL_CURRENCIES = new Set(["VND", "JPY", "KRW"])

export function currencyDecimals(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2
}

/** "1.250.000 ₫" (VND) / "1,250.00 USD" — locale follows the active UI locale. */
export function formatMoney(
  value: number | null | undefined,
  currency: string = "VND",
  locale: string = "vi-VN"
): string {
  if (value == null || Number.isNaN(value)) return "—"
  const decimals = currencyDecimals(currency)
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
  const code = currency.toUpperCase()
  return code === "VND" ? `${formatted} ₫` : `${formatted} ${code}`
}

/** Compact amount without currency symbol — for tight table cells. */
export function formatAmount(
  value: number | null | undefined,
  currency: string = "VND",
  locale: string = "vi-VN"
): string {
  if (value == null || Number.isNaN(value)) return "—"
  const decimals = currencyDecimals(currency)
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/** Interest-rate style percent: rate is stored as annual percent (e.g. 8.5 → "8,5%/năm"). */
export function formatRatePercent(
  value: number | null | undefined,
  locale: string = "vi-VN"
): string {
  if (value == null || Number.isNaN(value)) return "—"
  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(value)}%`
}

/**
 * Parse a user-entered money string (Vietnamese or English conventions):
 * strips grouping separators, normalizes the decimal comma to a dot.
 * Returns undefined for empty/invalid input — callers decide the error.
 */
export function parseMoneyInput(raw: string): number | undefined {
  const cleaned = raw.trim()
  if (!cleaned) return undefined
  let normalized = cleaned.replace(/[₫$\s]/g, "")
  // If both "." and "," exist, assume "." is grouping and "," is decimal.
  if (normalized.includes(".") && normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".")
  } else if (normalized.includes(",") && !normalized.includes(".")) {
    // bare comma: grouping when followed by exactly 3 digits at end? treat as decimal
    normalized = normalized.replace(",", ".")
  }
  const value = Number(normalized)
  return Number.isFinite(value) ? value : undefined
}
