import { useCallback, useEffect, useMemo, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { formatAmount, formatDateShort, formatRatePercent, fromMinor } from "@workspace/format"
import { capitalApi } from "../api"

type TabKey = "fund-source-statement" | "fund-source-transactions"
type Row = Record<string, string | number | undefined>

const TABS: TabKey[] = ["fund-source-statement", "fund-source-transactions"]

function firstOfMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
}

function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

/** CFM reports (W4c): sổ nguồn vốn + giao dịch nguồn vốn, CSV export. */
export function ReportsPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<TabKey>("fund-source-statement")
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(today())
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      if (tab === "fund-source-statement") {
        const result = await capitalApi.fundSourceStatement({ from, to })
        setRows(result.items as unknown as Row[])
      } else {
        const result = await capitalApi.fundSourceTransactions({ from, to })
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
    if (tab === "fund-source-statement") {
      return ["contract_code", "fund_type_code", "counterparty_code", "contract_date", "maturity_date", "amount_minor", "interest_rate", "status"]
    }
    return ["movement_date", "contract_code", "movement_type", "amount_minor", "note", "status"]
  }, [tab])

  const exportCsv = useCallback(() => {
    const header = columns.join(",")
    const lines = rows.map((row) => columns.map((column) => `"${row[column] ?? ""}"`).join(","))
    const blob = new Blob(["\ufeff" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" })
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
    if (column === "amount_minor") {
      return formatAmount(fromMinor(Number(value), String(row.currency_code ?? "VND")), String(row.currency_code ?? "VND"))
    }
    if (column === "interest_rate") return formatRatePercent(Number(value))
    if (column.endsWith("_date")) return formatDateShort(String(value))
    return String(value)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("capital.reports.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("capital.reports.description")}</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label>{t("capital.reports.field.from")}</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("capital.reports.field.to")}</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {t("capital.reports.run")}
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
            {t(`capital.reports.tab.${value}`)}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-3 py-2">
                  {t(`capital.reports.col.${column}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-4 text-center text-muted-foreground">
                  {t("capital.reports.loading")}
                </td>
              </tr>
            )}
            {!loading && loadError && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-4 text-center text-muted-foreground">
                  {t("capital.reports.load_failed")}
                </td>
              </tr>
            )}
            {!loading && !loadError && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-4 text-center text-muted-foreground">
                  {t("capital.reports.empty")}
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
