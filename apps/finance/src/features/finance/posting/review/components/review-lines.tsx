import { LedgerTable } from "@workspace/ui/components/ledger-table"

export interface ReviewLine {
  lineNo?: number
  direction?: string
  amountMinor?: number
  accountCode?: string
  accountName?: string
  currencyCode?: string
  description?: string
}

/** Read-only bút toán of the posting under review, as a ledger (Nợ / Có). */
export function ReviewLines({
  lines,
  currency,
}: {
  lines: ReviewLine[]
  currency: string
}) {
  if (lines.length === 0) return null
  return (
    <LedgerTable
      currency={currency}
      lines={lines.map((line, index) => ({
        key: `${line.lineNo ?? index}-${line.accountCode}`,
        lineNo: line.lineNo,
        direction: line.direction ?? "",
        accountCode: line.accountCode,
        accountName: line.accountName,
        amountMinor: line.amountMinor ?? 0,
        description: line.description,
      }))}
    />
  )
}
