// Money typed the Vietnamese way: "." groups thousands, "," starts decimals.
// The display text is grouped while typing; the value handed to forms is a
// plain canonical number string ("-1234.5"), so parseMoneyInput / Number()
// keep working unchanged.

export type MoneyText = {
  /** What the input shows: "1.234.567,5". */
  display: string
  /** What the form receives: "1234567.5", "" when empty. */
  canonical: string
}

function group(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

/**
 * Clean typed text: digits, one decimal comma (only when `decimals` > 0),
 * an optional leading minus. Grouping dots and anything else are dropped.
 */
export function parseMoneyText(
  raw: string,
  decimals: number,
  allowNegative = false
): MoneyText {
  const negative = allowNegative && raw.trim().startsWith("-")
  const commaAt = decimals > 0 ? raw.indexOf(",") : -1
  const intRaw = commaAt >= 0 ? raw.slice(0, commaAt) : raw
  const fracRaw = commaAt >= 0 ? raw.slice(commaAt + 1) : ""
  const intDigits = intRaw.replace(/\D/g, "").replace(/^0+(?=\d)/, "")
  const fracDigits = fracRaw.replace(/\D/g, "").slice(0, decimals)
  const hasComma = commaAt >= 0
  if (!intDigits && !fracDigits && !hasComma) {
    return { display: negative ? "-" : "", canonical: "" }
  }
  const intPart = intDigits || "0"
  const sign = negative ? "-" : ""
  return {
    display: sign + group(intPart) + (hasComma ? "," + fracDigits : ""),
    canonical: sign + intPart + (fracDigits ? "." + fracDigits : ""),
  }
}

/** Canonical ("1234.5", or a number) → grouped display ("1.234,5"). */
export function formatMoneyText(
  value: string | number | null | undefined,
  decimals: number
): string {
  if (value === null || value === undefined || value === "") return ""
  const text = String(value).trim()
  if (!/^-?\d+(\.\d+)?$/.test(text)) return ""
  const negative = text.startsWith("-")
  const [intPart, fracPart = ""] = text.replace("-", "").split(".")
  const frac = fracPart.slice(0, decimals)
  return (negative ? "-" : "") + group(intPart.replace(/^0+(?=\d)/, "")) + (frac ? "," + frac : "")
}

/**
 * Caret position in `next` that keeps the caret after the same number of
 * meaningful characters (digits, comma, minus) it had in `previous`.
 */
export function caretAfterReformat(previous: string, caret: number, next: string): number {
  const meaningful = (ch: string) => /[\d,-]/.test(ch)
  let count = 0
  for (let i = 0; i < caret && i < previous.length; i++) {
    if (meaningful(previous[i]!)) count++
  }
  if (count === 0) return 0
  let seen = 0
  for (let i = 0; i < next.length; i++) {
    if (meaningful(next[i]!)) seen++
    if (seen === count) return i + 1
  }
  return next.length
}
