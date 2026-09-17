import { useCallback, useMemo, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
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
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{t("finance.ledger.col.entry_no")}</TableHead>
                <TableHead>{t("finance.ledger.col.date")}</TableHead>
                <TableHead>{t("finance.ledger.col.description")}</TableHead>
                <TableHead className="text-right">{t("finance.ledger.col.debit")}</TableHead>
                <TableHead className="text-right">{t("finance.ledger.col.credit")}</TableHead>
                <TableHead className="text-right">{t("finance.ledger.col.running")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/30 font-medium">
                <TableCell colSpan={5} className="text-right">
                  {t("finance.ledger.opening")}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAmount(fromMinor(result.opening_minor), "VND")}
                </TableCell>
              </TableRow>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-4 text-center text-muted-foreground">
                    {t("finance.ledger.empty")}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row) => (
                <TableRow key={`${row.entry_id}-${row.entry_no}`}>
                  <TableCell className="font-mono text-xs">{row.entry_no}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateShort(row.entry_date)}</TableCell>
                  <TableCell>{row.description || row.document_type || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.debit_minor > 0 ? formatAmount(fromMinor(row.debit_minor), "VND") : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.credit_minor > 0 ? formatAmount(fromMinor(row.credit_minor), "VND") : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatAmount(fromMinor(row.running), "VND")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
