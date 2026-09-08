import { useCallback, useEffect, useState } from "react"
import {
  financeApi,
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
  const [result, setResult] = useState<StatementResult | null>(null)
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

  const run = useCallback(() => {
    if (!selected) return
    setLoadingRun(true)
    let cancelled = false
    void financeApi
      .runStatement(selected, asOf || undefined)
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
  }, [selected, asOf])

  const exportXlsx = useCallback(async () => {
    if (!selected) return
    setExporting(true)
    try {
      await downloadFile(
        `/api/finance/statements/${encodeURIComponent(selected)}/export${asOf ? `?as_of=${encodeURIComponent(asOf)}` : ""}`,
        { fallbackFilename: `${selected.toLowerCase()}.xlsx` }
      )
    } catch {
      notify.error("Could not export statement")
    } finally {
      setExporting(false)
    }
  }, [selected, asOf])

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
        <Header selected={selected} asOf={asOf} onAsOfChange={setAsOf} />
        <p className="text-sm text-muted-foreground">
          No statements defined for this tenant.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Header selected={selected} asOf={asOf} onAsOfChange={setAsOf} />
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
              As of {result.as_of}
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
}: {
  selected: string
  asOf: string
  onAsOfChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary" className="px-2.5 py-1 text-xs">
        Statements
      </Badge>
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
