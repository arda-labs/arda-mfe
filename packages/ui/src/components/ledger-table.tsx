import type { ReactNode } from "react"
import { Check, TriangleAlert } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { formatAmount, fromMinor } from "@workspace/format"
import { cn } from "@workspace/ui/lib/utils"

export type LedgerLine = {
  key?: string | number
  lineNo?: number
  direction: "DEBIT" | "CREDIT" | string
  accountCode?: string
  accountName?: string
  amountMinor: number
  description?: string
}

export function ledgerTotals(lines: Pick<LedgerLine, "direction" | "amountMinor">[]) {
  let debitMinor = 0
  let creditMinor = 0
  for (const line of lines) {
    if (line.direction === "DEBIT") debitMinor += line.amountMinor
    else if (line.direction === "CREDIT") creditMinor += line.amountMinor
  }
  return { debitMinor, creditMinor, balanced: debitMinor === creditMinor }
}

/** "Cân đối" (green) or "Lệch 1.000" (red): debit vs credit in minor units. */
export function BalanceIndicator({
  debitMinor,
  creditMinor,
  currency = "VND",
  className,
}: {
  debitMinor: number
  creditMinor: number
  currency?: string
  className?: string
}) {
  const { t } = useI18n()
  const diff = Math.abs(debitMinor - creditMinor)
  const balanced = diff === 0
  return (
    <span
      role="status"
      data-slot="balance-indicator"
      data-balanced={balanced}
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        balanced
          ? "border-success/20 bg-success/10 text-success"
          : "border-destructive/20 bg-destructive/10 text-destructive",
        className
      )}
    >
      {balanced ? <Check aria-hidden className="size-3" /> : <TriangleAlert aria-hidden className="size-3" />}
      {balanced
        ? t("common.ledger.balanced")
        : t("common.ledger.off_by", { amount: formatAmount(fromMinor(diff, currency), currency) })}
    </span>
  )
}

/**
 * Read-only journal lines the way accountants read them (design board 09):
 * separate Nợ / Có columns, account code in mono with its name, a double
 * rule above the totals and a balance chip. Editable grids keep their own
 * layout and reuse BalanceIndicator.
 */
export function LedgerTable({
  lines,
  currency = "VND",
  caption,
  loading = false,
  emptyText,
  className,
}: {
  lines: LedgerLine[]
  currency?: string
  /** Shown above the table on the left (e.g. document type). */
  caption?: ReactNode
  loading?: boolean
  emptyText?: string
  className?: string
}) {
  const { t } = useI18n()
  const totals = ledgerTotals(lines)
  const amount = (minor: number) => formatAmount(fromMinor(minor, currency), currency)
  const head = "h-control px-3 text-xs font-medium text-muted-foreground"

  return (
    <div data-slot="ledger-table" className={cn("overflow-hidden rounded-lg border", className)}>
      {caption || lines.length > 0 ? (
        <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-3 py-2 text-xs">
          <span className="min-w-0 truncate text-muted-foreground">{caption}</span>
          {lines.length > 0 ? (
            <BalanceIndicator
              debitMinor={totals.debitMinor}
              creditMinor={totals.creditMinor}
              currency={currency}
            />
          ) : null}
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className={cn(head, "w-10 text-left")}>{t("common.ledger.no")}</th>
              <th className={cn(head, "text-left")}>{t("common.ledger.account")}</th>
              <th className={cn(head, "text-left")}>{t("common.ledger.description")}</th>
              <th className={cn(head, "w-36 text-right")}>{t("common.ledger.debit")}</th>
              <th className={cn(head, "w-36 text-right")}>{t("common.ledger.credit")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  …
                </td>
              </tr>
            ) : lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  {emptyText ?? t("common.ledger.empty")}
                </td>
              </tr>
            ) : (
              lines.map((line, index) => (
                <tr key={line.key ?? `${line.lineNo ?? index}-${line.accountCode}`} className="border-b last:border-0">
                  <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">
                    {line.lineNo ?? index + 1}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs">{line.accountCode || "—"}</span>
                    {line.accountName ? (
                      <span className="ml-2 text-muted-foreground">{line.accountName}</span>
                    ) : null}
                  </td>
                  <td className="max-w-72 truncate px-3 py-2 text-muted-foreground" title={line.description}>
                    {line.description || "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {line.direction === "DEBIT" ? amount(line.amountMinor) : ""}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {line.direction === "CREDIT" ? amount(line.amountMinor) : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {lines.length > 0 && !loading ? (
            <tfoot>
              <tr className="border-t-[3px] border-double border-foreground/30 font-semibold">
                <td colSpan={3} className="px-3 py-2 text-right text-xs text-muted-foreground">
                  {t("common.ledger.total")} ({currency})
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{amount(totals.debitMinor)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{amount(totals.creditMinor)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  )
}
