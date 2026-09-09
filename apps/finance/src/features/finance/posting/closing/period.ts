import type { ClosingAccountRow, ClosingPeriodType } from "../../api"

/** i18n label key per closing period (Kỳ kết chuyển: Ngày/Tháng/Quý/Năm). */
export const CLOSING_PERIOD_LABEL_KEYS: Record<ClosingPeriodType, string> = {
  D: "finance.posting.closing.period_day",
  M: "finance.posting.closing.period_month",
  Q: "finance.posting.closing.period_quarter",
  Y: "finance.posting.closing.period_year",
}

/**
 * Cuối kỳ theo period type (FAC.203.01): D = hôm nay, M = cuối tháng hiện
 * tại, Q = cuối quý hiện tại, Y = 31/12. Pure helper — no locale/format
 * package dependency, so tests can pin any `now`.
 */
export function periodEndISO(period: ClosingPeriodType, now = new Date()): string {
  const year = now.getFullYear()
  const iso = (y: number, month1Based: number, day: number) =>
    `${y}-${String(month1Based).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  switch (period) {
    case "D":
      return iso(year, now.getMonth() + 1, now.getDate())
    case "M":
      return iso(year, now.getMonth() + 1, new Date(year, now.getMonth() + 1, 0).getDate())
    case "Q": {
      const quarterEndMonth = Math.floor(now.getMonth() / 3) * 3 + 3
      return iso(year, quarterEndMonth, new Date(year, quarterEndMonth, 0).getDate())
    }
    case "Y":
      return `${year}-12-31`
  }
}

export interface ClosingTotals {
  incomeMinor: number
  expenseMinor: number
  /** Kết quả kinh doanh = ΣINC − ΣEXP (EPAS FAC.203.01). */
  resultMinor: number
}

/** Totals computed from the closing rows (Số tiền kết chuyển per account). */
export function computeClosingTotals(rows: ClosingAccountRow[]): ClosingTotals {
  let incomeMinor = 0
  let expenseMinor = 0
  for (const row of rows) {
    if (row.acc_purpose === "INC") incomeMinor += row.closing_amount_minor
    else expenseMinor += row.closing_amount_minor
  }
  return { incomeMinor, expenseMinor, resultMinor: incomeMinor - expenseMinor }
}
