import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { trialBalanceApi, type TrialBalanceEntry } from "@/features/finance/api"
import { formatAmount, fromMinor } from "@workspace/format"
import { notify } from "@workspace/ui/feedback/notify"
import { Spinner } from "@workspace/ui/components/spinner"
import { Badge } from "@workspace/ui/components/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

/** Journal-aggregated trial balance (PostingService schema). */
export function TrialBalancePage() {
  const { t } = useI18n()
  const [entries, setEntries] = useState<TrialBalanceEntry[]>([])
  const [asOf, setAsOf] = useState("")
  const [totalDebit, setTotalDebit] = useState(0)
  const [totalCredit, setTotalCredit] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void trialBalanceApi
      .trialBalance()
      .then((result) => {
        if (cancelled) return
        setEntries(result.entries ?? [])
        setAsOf(result.as_of)
        setTotalDebit(result.total_debit_minor)
        setTotalCredit(result.total_credit_minor)
      })
      .catch(() => {
        if (!cancelled) notify.error(t("finance.trial_balance.load_failed"))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [t])

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
          {t("finance.trial_balance.title")}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {t("finance.trial_balance.as_of", { date: asOf })}
        </span>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="p-3">{t("finance.trial_balance.col.account")}</TableHead>
              <TableHead className="p-3">{t("finance.trial_balance.col.code")}</TableHead>
              <TableHead className="p-3">{t("finance.trial_balance.col.coa")}</TableHead>
              <TableHead className="p-3">{t("finance.trial_balance.col.currency")}</TableHead>
              <TableHead className="p-3 text-right">{t("finance.trial_balance.col.debit")}</TableHead>
              <TableHead className="p-3 text-right">{t("finance.trial_balance.col.credit")}</TableHead>
              <TableHead className="p-3 text-right">{t("finance.trial_balance.col.balance")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow
                key={`${entry.account_code}-${entry.currency_code}`}
                className="hover:bg-muted/30"
              >
                <TableCell className="p-3 font-medium">{entry.account_name || "—"}</TableCell>
                <TableCell className="p-3 font-mono text-xs text-muted-foreground">
                  {entry.account_code}
                </TableCell>
                <TableCell className="p-3 font-mono text-xs text-muted-foreground">
                  {entry.coa_version}
                </TableCell>
                <TableCell className="p-3 text-muted-foreground">
                  {entry.currency_code}
                </TableCell>
                <TableCell className="p-3 text-right font-mono tabular-nums">
                  {formatAmount(fromMinor(entry.debit_minor, entry.currency_code), entry.currency_code)}
                </TableCell>
                <TableCell className="p-3 text-right font-mono tabular-nums">
                  {formatAmount(fromMinor(entry.credit_minor, entry.currency_code), entry.currency_code)}
                </TableCell>
                <TableCell className="p-3 text-right font-mono tabular-nums">
                  {formatAmount(fromMinor(entry.balance_minor, entry.currency_code), entry.currency_code)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="bg-muted/30">
            <TableRow>
              <TableCell colSpan={4} className="p-3 text-right">
                {t("finance.trial_balance.total")}
              </TableCell>
              <TableCell className="p-3 text-right font-mono tabular-nums">
                {formatAmount(fromMinor(totalDebit), "VND")}
              </TableCell>
              <TableCell className="p-3 text-right font-mono tabular-nums">
                {formatAmount(fromMinor(totalCredit), "VND")}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">
        {totalDebit === totalCredit
          ? t("finance.trial_balance.balanced")
          : t("finance.trial_balance.unbalanced", {
              amount: formatAmount(fromMinor(totalDebit - totalCredit), "VND"),
            })}
      </p>
    </div>
  )
}
