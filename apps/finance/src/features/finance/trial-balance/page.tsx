import { useEffect, useState } from "react"
import { financeApi, type TrialBalanceEntry } from "@/features/finance/api"
import { formatAmount, fromMinor } from "@workspace/format"
import { notify } from "@workspace/ui/feedback/notify"
import { Spinner } from "@workspace/ui/components/spinner"
import { Badge } from "@workspace/ui/components/badge"

/** Journal-aggregated trial balance (PostingService schema). */
export function TrialBalancePage() {
  const [entries, setEntries] = useState<TrialBalanceEntry[]>([])
  const [asOf, setAsOf] = useState("")
  const [totalDebit, setTotalDebit] = useState(0)
  const [totalCredit, setTotalCredit] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void financeApi
      .trialBalance()
      .then((result) => {
        if (cancelled) return
        setEntries(result.entries ?? [])
        setAsOf(result.as_of)
        setTotalDebit(result.total_debit_minor)
        setTotalCredit(result.total_credit_minor)
      })
      .catch(() => {
        if (!cancelled) notify.error("Could not load trial balance")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner className="size-6" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="px-2.5 py-1 text-xs">
          Trial Balance
        </Badge>
        <span className="text-xs text-muted-foreground">As of {asOf}</span>
      </div>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-3 text-left font-medium">Account</th>
              <th className="p-3 text-left font-medium">Code</th>
              <th className="p-3 text-left font-medium">COA</th>
              <th className="p-3 text-left font-medium">Currency</th>
              <th className="p-3 text-right font-medium">Debit</th>
              <th className="p-3 text-right font-medium">Credit</th>
              <th className="p-3 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={`${entry.account_code}-${entry.currency_code}`}
                className="border-b last:border-0 hover:bg-muted/30"
              >
                <td className="p-3 font-medium">{entry.account_name || "—"}</td>
                <td className="p-3 font-mono text-xs text-muted-foreground">
                  {entry.account_code}
                </td>
                <td className="p-3 font-mono text-xs text-muted-foreground">
                  {entry.coa_version}
                </td>
                <td className="p-3 text-muted-foreground">
                  {entry.currency_code}
                </td>
                <td className="p-3 text-right font-mono tabular-nums">
                  {formatAmount(fromMinor(entry.debit_minor, entry.currency_code), entry.currency_code)}
                </td>
                <td className="p-3 text-right font-mono tabular-nums">
                  {formatAmount(fromMinor(entry.credit_minor, entry.currency_code), entry.currency_code)}
                </td>
                <td className="p-3 text-right font-mono tabular-nums">
                  {formatAmount(fromMinor(entry.balance_minor, entry.currency_code), entry.currency_code)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-muted/30 font-medium">
            <tr>
              <td colSpan={4} className="p-3 text-right">
                Total
              </td>
              <td className="p-3 text-right font-mono tabular-nums">
                {formatAmount(fromMinor(totalDebit), "VND")}
              </td>
              <td className="p-3 text-right font-mono tabular-nums">
                {formatAmount(fromMinor(totalCredit), "VND")}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">
        {totalDebit === totalCredit
          ? "✓ Balanced (Total Debit = Total Credit)"
          : `✗ Unbalanced: difference ${formatAmount(fromMinor(totalDebit - totalCredit), "VND")}`}
      </p>
    </div>
  )
}
