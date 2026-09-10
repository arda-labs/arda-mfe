import { useMemo } from "react"
import { useI18n } from "@workspace/i18n"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { formatMoney, fromMinor } from "@workspace/format"

export interface ReviewLine {
  lineNo?: number
  direction?: string
  amountMinor?: number
  accountCode?: string
  accountName?: string
  currencyCode?: string
  description?: string
}

/** Read-only bút toán grid + totals for the posting review screen. */
export function ReviewLines({
  lines,
  currency,
}: {
  lines: ReviewLine[]
  currency: string
}) {
  const { t } = useI18n()
  const totals = useMemo(() => {
    let debit = 0
    let credit = 0
    for (const line of lines) {
      if (line.direction === "DEBIT") debit += line.amountMinor ?? 0
      if (line.direction === "CREDIT") credit += line.amountMinor ?? 0
    }
    return { debit, credit }
  }, [lines])

  if (lines.length === 0) return null

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              {t("finance.posting_review.col.no")}
            </TableHead>
            <TableHead className="w-24">
              {t("finance.posting_review.col.direction")}
            </TableHead>
            <TableHead>{t("finance.posting_review.col.account")}</TableHead>
            <TableHead className="text-right">
              {t("finance.posting_review.col.amount")}
            </TableHead>
            <TableHead>{t("finance.posting_review.col.description")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line, index) => (
            <TableRow key={`${line.lineNo ?? index}-${line.accountCode}`}>
              <TableCell className="tabular-nums">
                {line.lineNo ?? index + 1}
              </TableCell>
              <TableCell>
                {line.direction
                  ? t(`finance.posting_review.direction.${line.direction}`)
                  : "—"}
              </TableCell>
              <TableCell className="tabular-nums">
                {line.accountCode || "—"}
                {line.accountName ? (
                  <span className="ml-2 text-muted-foreground">
                    {line.accountName}
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(
                  fromMinor(line.amountMinor ?? 0, line.currencyCode || currency)
                )}
              </TableCell>
              <TableCell className="max-w-72 truncate" title={line.description}>
                {line.description || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end gap-6 border-t px-4 py-2 text-sm">
        <span>
          {t("finance.posting_review.total.debit")}:{" "}
          <span className="font-medium tabular-nums">
            {formatMoney(fromMinor(totals.debit, currency))}
          </span>
        </span>
        <span>
          {t("finance.posting_review.total.credit")}:{" "}
          <span className="font-medium tabular-nums">
            {formatMoney(fromMinor(totals.credit, currency))}
          </span>
        </span>
      </div>
    </div>
  )
}
