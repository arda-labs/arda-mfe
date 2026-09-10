import { useCallback, useMemo, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { formatAmount, formatDateShort, fromMinor } from "@workspace/format"
import { getLedger, type LedgerLine, type LedgerResult } from "../api"

function firstOfMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
}

function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

/** Account ledger (sổ cái / sổ chi tiết): opening + posted lines + running. */
export function LedgerPage() {
  const { t } = useI18n()
  const [account, setAccount] = useState("")
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(today())
  const [result, setResult] = useState<LedgerResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const run = useCallback(async () => {
    if (!account || !from || !to) return
    setLoading(true)
    setError(false)
    try {
      setResult(await getLedger({ account, from, to }))
    } catch {
      setResult(null)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [account, from, to])

  const rows = useMemo(() => {
    if (!result) return []
    let running = result.opening_minor
    return result.lines.map((line: LedgerLine) => {
      running += line.debit_minor - line.credit_minor
      return { ...line, running }
    })
  }, [result])

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div>
        <h1 className="text-lg font-semibold">{t("finance.ledger.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("finance.ledger.description")}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
        <div className="space-y-1.5">
          <Label>{t("finance.ledger.field.account")}</Label>
          <Input
            value={account}
            className="font-mono"
            placeholder="4231"
            onChange={(e) => setAccount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("finance.ledger.field.from")}</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("finance.ledger.field.to")}</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button onClick={() => void run()} disabled={loading || !account}>
          {t("finance.ledger.run")}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {t("finance.ledger.load_failed")}
        </div>
      )}

      {result && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{t("finance.ledger.col.entry_no")}</th>
                <th className="px-3 py-2">{t("finance.ledger.col.date")}</th>
                <th className="px-3 py-2">{t("finance.ledger.col.description")}</th>
                <th className="px-3 py-2 text-right">{t("finance.ledger.col.debit")}</th>
                <th className="px-3 py-2 text-right">{t("finance.ledger.col.credit")}</th>
                <th className="px-3 py-2 text-right">{t("finance.ledger.col.running")}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border bg-muted/30 font-medium">
                <td colSpan={5} className="px-3 py-2 text-right">
                  {t("finance.ledger.opening")}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatAmount(fromMinor(result.opening_minor), "VND")}
                </td>
              </tr>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                    {t("finance.ledger.empty")}
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={`${row.entry_id}-${row.entry_no}`} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{row.entry_no}</td>
                  <td className="whitespace-nowrap px-3 py-2">{formatDateShort(row.entry_date)}</td>
                  <td className="px-3 py-2">{row.description || row.document_type || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.debit_minor > 0 ? formatAmount(fromMinor(row.debit_minor), "VND") : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.credit_minor > 0 ? formatAmount(fromMinor(row.credit_minor), "VND") : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {formatAmount(fromMinor(row.running), "VND")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
