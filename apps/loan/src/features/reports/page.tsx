import { useCallback, useEffect, useMemo, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { formatAmount, formatDateShort, formatRatePercent, fromMinor } from "@workspace/format"
import { loanReportApi } from "../api"

type TabKey =
  | "loan-ledger"
  | "loan-statement"
  | "collateral-statement"
  | "loan-diary"
  | "loan-appraisal"
  | "loan-reconciliation"
type Row = Record<string, string | number | undefined>

const TABS: TabKey[] = [
  "loan-ledger",
  "loan-statement",
  "collateral-statement",
  "loan-diary",
  "loan-appraisal",
  "loan-reconciliation",
]

function firstOfMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
}

function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

/** LNM reports (W4c): sổ khoản vay, sao kê, tài sản bảo đảm — CSV export. */
export function ReportsPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<TabKey>("loan-ledger")
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(today())
  const [contractCode, setContractCode] = useState("")
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      if (tab === "loan-ledger") {
        const result = await loanReportApi.loanLedger({
          from,
          to,
          contract_code: contractCode || undefined,
        })
        setRows(result.items as unknown as Row[])
      } else if (tab === "loan-statement") {
        const result = await loanReportApi.loanStatement({
          contract_code: contractCode || undefined,
        })
        setRows(result.items as unknown as Row[])
      } else if (tab === "collateral-statement") {
        const result = await loanReportApi.collateralStatement({})
        setRows(result.items as unknown as Row[])
      } else if (tab === "loan-diary") {
        const result = await loanReportApi.loanDiary({
          from,
          to,
          contract_code: contractCode || undefined,
        })
        setRows(result.items as unknown as Row[])
      } else if (tab === "loan-appraisal") {
        const result = await loanReportApi.loanAppraisal({
          contract_code: contractCode || undefined,
        })
        setRows(result.items as unknown as Row[])
      } else {
        const result = await loanReportApi.loanReconciliation({
          contract_code: contractCode || undefined,
        })
        setRows(result.items as unknown as Row[])
      }
    } catch {
      setRows([])
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [contractCode, from, tab, to])

  useEffect(() => {
    void load()
  }, [load])

  const columns = useMemo(() => {
    if (tab === "loan-ledger") {
      return ["txn_date", "contract_code", "txn_type", "amount_minor", "principal_minor", "interest_minor", "status"]
    }
    if (tab === "loan-statement") {
      return ["contract_code", "agreement_code", "disburse_date", "maturity_date", "debt_group_code", "disburse_amt_minor", "outstanding_amt_minor", "coln_principal_amt_minor", "coln_interest_amt_minor", "interest_rate", "status"]
    }
    if (tab === "collateral-statement") {
      return ["coll_code", "coll_name", "coll_type_code", "owner_cif_code", "owner_name", "coll_value_minor", "coll_use_value_minor", "valuation_date", "status"]
    }
    if (tab === "loan-diary") {
      return ["txn_date", "contract_code", "txn_type", "amount_minor", "status"]
    }
    if (tab === "loan-appraisal") {
      return ["contract_code", "agreement_code", "disburse_date", "maturity_date", "debt_group_code", "disburse_amt_minor", "outstanding_amt_minor", "collateral_minor", "coverage_ratio", "interest_rate", "loan_term", "status"]
    }
    return ["contract_code", "agreement_code", "outstanding_amt_minor", "planned_principal_minor", "planned_interest_minor", "variance_minor"]
  }, [tab])

  const exportCsv = useCallback(() => {
    const header = columns.join(",")
    const lines = rows.map((row) => columns.map((column) => `"${row[column] ?? ""}"`).join(","))
    const blob = new Blob(["\ufeff" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${tab}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }, [columns, rows, tab])

  const cellValue = (row: Row, column: string): string => {
    const value = row[column]
    if (value === null || value === undefined || value === "") return "—"
    if (column.endsWith("_minor")) {
      return formatAmount(fromMinor(Number(value), String(row.currency_code ?? "VND")), String(row.currency_code ?? "VND"))
    }
    if (column === "interest_rate") return formatRatePercent(Number(value))
    if (column === "coverage_ratio") return `${(Number(value) * 100).toFixed(2)}%`
    if (column.endsWith("_date")) return formatDateShort(String(value))
    return String(value)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("loan.reports.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("loan.reports.description")}</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label>{t("loan.reports.field.contract")}</Label>
            <Input
              value={contractCode}
              className="font-mono"
              onChange={(e) => setContractCode(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("loan.reports.field.from")}</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("loan.reports.field.to")}</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {t("loan.reports.run")}
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
            {t(`loan.reports.tab.${value}`)}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-3 py-2">
                  {t(`loan.reports.col.${column}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-4 text-center text-muted-foreground">
                  {t("loan.reports.loading")}
                </td>
              </tr>
            )}
            {!loading && loadError && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-4 text-center text-muted-foreground">
                  {t("loan.reports.load_failed")}
                </td>
              </tr>
            )}
            {!loading && !loadError && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-4 text-center text-muted-foreground">
                  {t("loan.reports.empty")}
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
