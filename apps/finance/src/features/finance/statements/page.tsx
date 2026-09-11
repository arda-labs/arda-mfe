import { useCallback, useEffect, useState } from "react"
import {
  financeApi,
  type FinancialSummary,
  type RiskException,
  type StatementResult,
  type StatementSummary,
} from "@/features/finance/api"
import { downloadFile } from "@workspace/api"
import { formatAmount, fromMinor } from "@workspace/format"
import { notify } from "@workspace/ui/feedback/notify"
import { Spinner } from "@workspace/ui/components/spinner"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

/**
 * Fixed-format statements (P3b): pick a statement code + as-of date, render
 * the fin_statement_formula rows against the fin_trial_balance_daily
 * precompute, export XLSX. Layout mirrors the trial-balance page shell.
 */
export function StatementsPage() {
  const [statements, setStatements] = useState<StatementSummary[]>([])
  const [selected, setSelected] = useState("")
  const [asOf, setAsOf] = useState("")
  const [from, setFrom] = useState("")
  const [result, setResult] = useState<StatementResult | null>(null)
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [exceptions, setExceptions] = useState<RiskException[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingRun, setLoadingRun] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let cancelled = false
    void financeApi
      .listStatements()
      .then((items) => {
        if (cancelled) return
        setStatements(items)
        if (items.length > 0) setSelected((prev) => prev || items[0].statement_code)
      })
      .catch(() => {
        if (!cancelled) notify.error("Could not load statements")
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void financeApi
      .financialSummary(asOf || undefined, from || undefined)
      .then((res) => {
        if (!cancelled) setSummary(res)
      })
      .catch(() => {
        if (!cancelled) setSummary(null)
      })
    void financeApi
      .riskExceptions(asOf || undefined)
      .then((res) => {
        if (!cancelled) setExceptions(res)
      })
      .catch(() => {
        if (!cancelled) setExceptions([])
      })
    return () => {
      cancelled = true
    }
  }, [asOf, from])

  const run = useCallback(() => {
    if (!selected) return
    setLoadingRun(true)
    let cancelled = false
    void financeApi
      .runStatement(selected, asOf || undefined, undefined, from || undefined)
      .then((res) => {
        if (cancelled) return
        setResult(res)
      })
      .catch(() => {
        if (!cancelled) notify.error("Could not render statement")
      })
      .finally(() => {
        if (!cancelled) setLoadingRun(false)
      })
    return () => {
      cancelled = true
    }
  }, [selected, asOf, from])

  const exportXlsx = useCallback(async () => {
    if (!selected) return
    setExporting(true)
    try {
      const query = new URLSearchParams()
      if (asOf) query.set("as_of", asOf)
      if (from) query.set("from", from)
      const suffix = query.toString() ? `?${query.toString()}` : ""
      await downloadFile(
        `/api/finance/statements/${encodeURIComponent(selected)}/export${suffix}`,
        { fallbackFilename: `${selected.toLowerCase()}.xlsx` }
      )
    } catch {
      notify.error("Could not export statement")
    } finally {
      setExporting(false)
    }
  }, [selected, asOf, from])

  if (loadingList) {
    return (
      <div className="flex justify-center p-8">
        <Spinner className="size-6" />
      </div>
    )
  }

  if (statements.length === 0) {
    return (
      <div className="space-y-4">
        <Header
          selected={selected}
          asOf={asOf}
          onAsOfChange={setAsOf}
          from={from}
          onFromChange={setFrom}
        />
        <p className="text-sm text-muted-foreground">
          No statements defined for this tenant.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Header
        selected={selected}
        asOf={asOf}
        onAsOfChange={setAsOf}
        from={from}
        onFromChange={setFrom}
      />
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryTile label="Total assets" value={summary.total_assets_minor} />
          <SummaryTile label="Total liabilities" value={summary.total_liabilities_minor} />
          <SummaryTile label="Total equity" value={summary.total_equity_minor} />
          <SummaryTile label="Total income" value={summary.total_income_minor} />
          <SummaryTile label="Total expense" value={summary.total_expense_minor} />
          <SummaryTile label="Profit before tax" value={summary.profit_minor} />
        </div>
      )}
      {exceptions.length > 0 && (
        <div className="rounded-lg border">
          <div className="border-b px-3 py-2 text-xs font-semibold">
            Risk exceptions ({exceptions.length})
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2">Currency</th>
                <th className="px-3 py-2 text-right">Debit</th>
                <th className="px-3 py-2 text-right">Credit</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map((row) => (
                <tr key={`${row.account_code}-${row.currency_code}`} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{row.account_code}</td>
                  <td className="px-3 py-2 text-xs">{row.currency_code}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {formatAmount(fromMinor(row.close_debit_minor), row.currency_code)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {formatAmount(fromMinor(row.close_credit_minor), row.currency_code)}
                  </td>
                  <td className="px-3 py-2 text-xs text-destructive">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {statements.map((s) => (
          <Button
            key={s.statement_code}
            variant={s.statement_code === selected ? "default" : "outline"}
            size="sm"
            onClick={() => setSelected(s.statement_code)}
          >
            {s.statement_code}
          </Button>
        ))}
        <Button size="sm" onClick={run} disabled={loadingRun || !selected}>
          {loadingRun ? <Spinner className="size-4" /> : null}
          Render
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={exportXlsx}
          disabled={exporting || !selected}
        >
          {exporting ? <Spinner className="size-4" /> : null}
          Export XLSX
        </Button>
      </div>

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-2.5 py-1 text-xs">
              {result.statement_code}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {result.from_date && result.from_date !== result.as_of
                ? `${result.from_date} → ${result.as_of}`
                : `As of ${result.as_of}`}
            </span>
          </div>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">Label</th>
                  <th className="p-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr
                    key={row.row_code}
                    className={`border-b last:border-0 ${row.is_total ? "bg-muted/30 font-medium" : "hover:bg-muted/30"}`}
                  >
                    <td
                      className="p-3"
                      style={{ paddingLeft: `${12 + row.level * 24}px` }}
                    >
                      {row.label}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums">
                      {row.has_amount
                        ? formatAmount(fromMinor(row.amount_minor), "VND")
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Header({
  selected,
  asOf,
  onAsOfChange,
  from,
  onFromChange,
}: {
  selected: string
  asOf: string
  onAsOfChange: (v: string) => void
  from: string
  onFromChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary" className="px-2.5 py-1 text-xs">
        Statements
      </Badge>
      <Input
        type="date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        className="w-40"
        placeholder="From (optional)"
        aria-label={`From date for ${selected || "statement"}`}
      />
      <Input
        type="date"
        value={asOf}
        onChange={(e) => onAsOfChange(e.target.value)}
        className="w-40"
        placeholder="As of (latest if empty)"
        aria-label={`As-of date for ${selected || "statement"}`}
      />
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm tabular-nums">
        {formatAmount(fromMinor(value), "VND")}
      </div>
    </div>
  )
}
