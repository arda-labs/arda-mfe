/**
 * Date helpers — thin, locale-safe wrappers so pages never hand-roll
 * `toISOString().slice(0, 10)` or timezone-unsafe parsing. Backend dates are
 * "YYYY-MM-DD" (DATE columns) or RFC3339 timestamps.
 */

/**
 * Platform business timezone. Every timestamp display resolves here instead
 * of the browser's OS timezone (docs/db-schema-conventions.md §8) so all
 * users — regardless of device settings — see the same Vietnam wall time.
 * The backend profile field `iam_users.timezone` will override this once the
 * per-user display contract lands.
 */
export const APP_TIMEZONE = "Asia/Ho_Chi_Minh"

/** "2026-09-06" from a DATE string / RFC3339 timestamp; "—" when absent. */
export function formatDateShort(value: string | null | undefined, locale = "vi-VN"): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: APP_TIMEZONE,
  }).format(date)
}

/** "YYYY-MM-DD" of an instant rendered in the app timezone. */
function isoDayInAppTz(date: Date): string {
  // "sv-SE" formats dates as ISO-like "YYYY-MM-DD" — the stable trick for
  // tz-aware day extraction without hand-rolling offset math.
  return new Intl.DateTimeFormat("sv-SE", { timeZone: APP_TIMEZONE }).format(date)
}

/** Today's business date (app timezone) as "YYYY-MM-DD" — safe default for date inputs. */
export function todayISO(): string {
  return isoDayInAppTz(new Date())
}

/** "YYYY-MM-DD" of an API timestamp/DATE value rendered in the app timezone. */
export function dateInputValue(value: string | Date | null | undefined): string {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return isoDayInAppTz(date)
}

/** True when the DATE string is a valid calendar date (guards <input type="date">). */
export function isValidISODate(value: string | null | undefined): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
