import { useCallback, useEffect, useMemo, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { formatAmount, formatDateShort, fromMinor } from "@workspace/format"
import { depositApi } from "../api"

type TabKey = "deposit-statement" | "deposit-transactions" | "interbank-statement" | "interbank-transactions"
type Row = Record<string, string | number | undefined>

const TABS: TabKey[] = [
  "deposit-statement",
  "deposit-transactions",
  "interbank-statement",
  "interbank-transactions",
]

function firstOfMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
}

function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

/** DPM/IBM reports (W4c): data owner computes, FE renders + exports CSV. */
export function ReportsPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<TabKey>("deposit-statement")
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(today())
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      if (tab === "deposit-statement") {
        const result = await depositApi.depositStatement({ from, to })
        setRows(result.items as unknown as Row[])
      } else if (tab === "deposit-transactions") {
        const result = await depositApi.depositTransactions({ from, to })
        setRows(result.items as unknown as Row[])
      } else if (tab === "interbank-statement") {
        const result = await depositApi.interbankStatement({ from, to })
        setRows(result.items as unknown as Row[])
      } else {
        const result = await depositApi.interbankTransactions({ from, to })
        setRows(result.items as unknown as Row[])
      }
    } catch {
      setRows([])
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [from, tab, to])

  useEffect(() => {
    void load()
  }, [load])

  const columns = useMemo(() => {
    switch (tab) {
      case "deposit-statement":
        return [
          "savings_code",
          "customer_code",
          "product_code",
          "open_date",
          "maturity_date",
          "principal_minor",
          "accrued_minor",
          "status",
        ]
      case "deposit-transactions":
        return ["txn_date", "savings_code", "txn_type", "amount_minor", "status"]
      case "interbank-statement":
        return [
          "deposit_code",
          "counterparty_code",
          "product_code",
          "deposit_date",
          "maturity_date",
          "principal_minor",
          "accrued_minor",
          "status",
        ]
      default:
        return ["movement_date", "deposit_code", "kind", "amount_minor", "status"]
    }
  }, [tab])

  const exportCsv = useCallback(() => {
    const header = columns.join(",")
    const lines = rows.map((row) => columns.map((column) => `"${row[column] ?? ""}"`).join(","))
    const csv = [header, ...lines].join("\n")
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${tab}-${from}-${to}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }, [columns, from, rows, tab, to])

  const cellValue = (row: Row, column: string): string => {
    const value = row[column]
    if (value === null || value === undefined || value === "") return "—"
    if (column.endsWith("_minor")) {
      return formatAmount(fromMinor(Number(value), String(row.currency_code ?? "VND")), String(row.currency_code ?? "VND"))
    }
    if (column.endsWith("_date")) return formatDateShort(String(value))
    return String(value)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("deposit.reports.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("deposit.reports.description")}</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label>{t("deposit.reports.field.from")}</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.reports.field.to")}</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {t("deposit.reports.run")}
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            {t("common.action.export_excel")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            className={
              value === tab
                ? "rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                : "rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/60"
            }
            onClick={() => setTab(value)}
          >
            {t(`deposit.reports.tab.${value}`)}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-3 py-2">
                  {t(`deposit.reports.col.${column}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-4 text-center text-muted-foreground">
                  {t("deposit.loading")}
                </td>
              </tr>
            )}
            {!loading && loadError && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-4 text-center text-muted-foreground">
                  {t("deposit.reports.load_failed")}
                </td>
              </tr>
            )}
            {!loading && !loadError && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-4 text-center text-muted-foreground">
                  {t("deposit.reports.empty")}
                </td>
              </tr>
            )}
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-border">
                {columns.map((column) => (
                  <td key={column} className="px-3 py-2">
                    {cellValue(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
