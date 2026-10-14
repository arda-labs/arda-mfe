const DAY_MS = 86_400_000

export type TermProgress = {
  /** Calendar days from start to maturity (0 when the dates are missing or inverted). */
  totalDays: number
  /** Days from today to maturity; negative once maturity has passed. */
  daysToMaturity: number | null
  /** Share of the term already elapsed, 0..1 (undefined without a usable term). */
  elapsed: number | undefined
}

function dayNumber(value: string | undefined | null): number | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS
}

/**
 * Where a term deposit stands between its start date and maturity, counted in
 * calendar days. Dates are ISO (`YYYY-MM-DD`, a time part is ignored); `today`
 * is the business date. Shared by savings books and interbank placements,
 * whose payloads both carry a start date and a maturity date.
 */
export function termProgress(
  start: string | undefined | null,
  maturity: string | undefined | null,
  today: string
): TermProgress {
  const from = dayNumber(start)
  const to = dayNumber(maturity)
  const now = dayNumber(today)
  const totalDays = from !== null && to !== null && to > from ? to - from : 0
  const daysToMaturity = to !== null && now !== null ? to - now : null
  const elapsed =
    totalDays > 0 && from !== null && now !== null
      ? Math.min(Math.max((now - from) / totalDays, 0), 1)
      : undefined
  return { totalDays, daysToMaturity, elapsed }
}

/** Maturity within this many days is flagged on an open contract. */
export const MATURITY_WARNING_DAYS = 30
