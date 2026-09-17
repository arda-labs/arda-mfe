import type { CashPositionRow } from "../../api"

/** The position report has no table controller — export the fetched rows as CSV. */
export function exportCashPositionCsv(rows: CashPositionRow[]) {
  const header = "txn_date,currency,cash_in_minor,cash_out_minor,net_minor"
  const lines = rows.map((row) =>
    [
      row.txn_date,
      row.currency_code,
      row.cash_in_minor,
      row.cash_out_minor,
      row.net_minor,
    ].join(",")
  )
  downloadCsv([header, ...lines].join("\n"), "cash-position.csv")
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
