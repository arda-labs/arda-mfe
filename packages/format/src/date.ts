/**
 * Date helpers — thin, locale-safe wrappers so pages never hand-roll
 * `toISOString().slice(0, 10)` or timezone-unsafe parsing. Backend dates are
 * "YYYY-MM-DD" (DATE columns) or RFC3339 timestamps.
 */

/** "2026-09-06" from a DATE string / RFC3339 timestamp; "—" when absent. */
export function formatDateShort(value: string | null | undefined, locale = "vi-VN"): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

/** Local midnight of today as "YYYY-MM-DD" — safe default for date inputs. */
export function todayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** True when the DATE string is a valid calendar date (guards <input type="date">). */
export function isValidISODate(value: string | null | undefined): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
