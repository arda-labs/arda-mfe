import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { statementsApi, type FinancialSummary, type RiskException, type StatementResult, type StatementSummary } from "@/features/finance/api"
import { downloadFile } from "@workspace/api"
import { formatAmount, fromMinor } from "@workspace/format"
import { notify } from "@workspace/ui/feedback/notify"
import { Spinner } from "@workspace/ui/components/spinner"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

/**
 * Fixed-format statements (P3b): pick a statement code + as-of date, render
 * the fin_statement_formula rows against the fin_trial_balance_daily
 * precompute, export XLSX. Layout mirrors the trial-balance page shell.
 */
export function StatementsPage() {
  const { t } = useI18n()
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
    void statementsApi
      .listStatements()
      .then((items) => {
        if (cancelled) return
        setStatements(items)
        if (items.length > 0) setSelected((prev) => prev || items[0].statement_code)
      })
      .catch(() => {
        if (!cancelled) notify.error(t("finance.statements.load_failed"))
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  useEffect(() => {
    let cancelled = false
    void statementsApi
      .financialSummary(asOf || undefined, from || undefined)
      .then((res) => {
        if (!cancelled) setSummary(res)
      })
      .catch(() => {
        if (!cancelled) setSummary(null)
      })
    void statementsApi
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
  }, [asOf, from, t])

  const run = useCallback(() => {
    if (!selected) return
    setLoadingRun(true)
    let cancelled = false
    void statementsApi
      .runStatement(selected, asOf || undefined, undefined, from || undefined)
      .then((res) => {
        if (cancelled) return
        setResult(res)
      })
      .catch(() => {
        if (!cancelled) notify.error(t("finance.statements.render_failed"))
      })
      .finally(() => {
        if (!cancelled) setLoadingRun(false)
      })
    return () => {
      cancelled = true
    }
  }, [selected, asOf, from, t])

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
      notify.error(t("finance.statements.export_failed"))
    } finally {
      setExporting(false)
    }
  }, [selected, asOf, from, t])

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
          {t("finance.statements.empty")}
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
          <SummaryTile label={t("finance.statements.summary.total_assets")} value={summary.total_assets_minor} />
          <SummaryTile label={t("finance.statements.summary.total_liabilities")} value={summary.total_liabilities_minor} />
          <SummaryTile label={t("finance.statements.summary.total_equity")} value={summary.total_equity_minor} />
          <SummaryTile label={t("finance.statements.summary.total_income")} value={summary.total_income_minor} />
          <SummaryTile label={t("finance.statements.summary.total_expense")} value={summary.total_expense_minor} />
          <SummaryTile label={t("finance.statements.summary.profit_before_tax")} value={summary.profit_minor} />
        </div>
      )}
      {exceptions.length > 0 && (
        <div className="rounded-lg border">
          <div className="border-b px-3 py-2 text-xs font-semibold">
            {t("finance.statements.risk_exceptions", { count: exceptions.length })}
          </div>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{t("finance.statements.col.account")}</TableHead>
                <TableHead>{t("finance.statements.col.currency")}</TableHead>
                <TableHead className="text-right">{t("finance.statements.col.debit")}</TableHead>
                <TableHead className="text-right">{t("finance.statements.col.credit")}</TableHead>
                <TableHead>{t("finance.statements.col.reason")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exceptions.map((row) => (
                <TableRow key={`${row.account_code}-${row.currency_code}`}>
                  <TableCell className="font-mono text-xs">{row.account_code}</TableCell>
                  <TableCell className="text-xs">{row.currency_code}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatAmount(fromMinor(row.close_debit_minor), row.currency_code)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatAmount(fromMinor(row.close_credit_minor), row.currency_code)}
                  </TableCell>
                  <TableCell className="text-xs text-destructive">{row.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
          {t("finance.statements.render")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={exportXlsx}
          disabled={exporting || !selected}
        >
          {exporting ? <Spinner className="size-4" /> : null}
          {t("finance.statements.export_xlsx")}
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
                ? t("finance.statements.range", { from: result.from_date, to: result.as_of })
                : t("finance.statements.as_of", { date: result.as_of })}
            </span>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="p-3">{t("finance.statements.col.label")}</TableHead>
                  <TableHead className="p-3 text-right">{t("finance.statements.col.amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((row) => (
                  <TableRow
                    key={row.row_code}
                    className={row.is_total ? "bg-muted/30 font-medium" : "hover:bg-muted/30"}
                  >
                    <TableCell
                      className="p-3"
                      style={{ paddingLeft: `${12 + row.level * 24}px` }}
                    >
                      {row.label}
                    </TableCell>
                    <TableCell className="p-3 text-right font-mono tabular-nums">
                      {row.has_amount
                        ? formatAmount(fromMinor(row.amount_minor), "VND")
                        : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
  const { t } = useI18n()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary" className="px-2.5 py-1 text-xs">
        {t("finance.statements.title")}
      </Badge>
      <Input
        type="date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        className="w-40"
        placeholder={t("finance.statements.placeholder.from")}
        aria-label={t("finance.statements.aria.from", {
          code: selected || t("finance.statements.title"),
        })}
      />
      <Input
        type="date"
        value={asOf}
        onChange={(e) => onAsOfChange(e.target.value)}
        className="w-40"
        placeholder={t("finance.statements.placeholder.as_of")}
        aria-label={t("finance.statements.aria.as_of", {
          code: selected || t("finance.statements.title"),
        })}
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
