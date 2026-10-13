// dd/MM/yyyy <-> yyyy-MM-dd for DateField. Wire values stay ISO dates; only
// the text the user sees and types is Vietnamese-ordered (design board 15).

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const VI_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/

function isRealDate(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1) return false
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** "2026-10-13" -> "13/10/2026"; anything else -> "". */
export function isoToDateText(iso: string | null | undefined): string {
  const match = ISO_DATE.exec(iso ?? "")
  if (!match) return ""
  const [, y, m, d] = match
  return isRealDate(+y!, +m!, +d!) ? `${d}/${m}/${y}` : ""
}

/** "13/10/2026" -> "2026-10-13"; incomplete or impossible dates -> null. */
export function dateTextToIso(text: string): string | null {
  const match = VI_DATE.exec(text.trim())
  if (!match) return null
  const [, d, m, y] = match
  return isRealDate(+y!, +m!, +d!) ? `${y}-${m}-${d}` : null
}

/**
 * Keeps digits only and inserts the slashes while typing, so "13102026"
 * becomes "13/10/2026". Accepts pasted ISO dates as well.
 */
export function maskDateText(raw: string): string {
  const pastedIso = isoToDateText(raw.trim())
  if (pastedIso) return pastedIso
  const digits = raw.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/** Local-calendar ISO date of a Date (no UTC shift). */
export function dateToIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** ISO date -> local Date at midnight, or undefined. */
export function isoToDate(iso: string | null | undefined): Date | undefined {
  const match = ISO_DATE.exec(iso ?? "")
  if (!match) return undefined
  return new Date(+match[1]!, +match[2]! - 1, +match[3]!)
}
