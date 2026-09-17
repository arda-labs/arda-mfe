import { useI18n } from "@workspace/i18n"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { formatAmount, formatDateShort, fromMinor } from "@workspace/format"
import type { CashPositionRow } from "../../api"

/** Daily in/out aggregation report (GET /api/finance/cash-position, unpaged). */
export function CashPositionTable({
  rows,
  loading,
}: {
  rows: CashPositionRow[]
  loading: boolean
}) {
  const { t } = useI18n()
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-3 py-2 text-xs">
            {t("finance.cash.field.date")}
          </TableHead>
          <TableHead className="px-3 py-2 text-xs">
            {t("common.field.currency")}
          </TableHead>
          <TableHead className="px-3 py-2 text-right text-xs">
            {t("finance.cash.col.cash_in")}
          </TableHead>
          <TableHead className="px-3 py-2 text-right text-xs">
            {t("finance.cash.col.cash_out")}
          </TableHead>
          <TableHead className="px-3 py-2 text-right text-xs">
            {t("finance.cash.col.net")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
              {t("common.loading")}
            </TableCell>
          </TableRow>
        ) : rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
              {t("finance.cash.empty")}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={`${row.txn_date}-${row.currency_code}`}>
              <TableCell className="whitespace-nowrap px-3 py-2">
                {formatDateShort(row.txn_date)}
              </TableCell>
              <TableCell className="px-3 py-2 font-mono text-xs">
                {row.currency_code}
              </TableCell>
              <TableCell className="px-3 py-2 text-right tabular-nums">
                {formatAmount(
                  fromMinor(row.cash_in_minor, row.currency_code),
                  row.currency_code
                )}
              </TableCell>
              <TableCell className="px-3 py-2 text-right tabular-nums">
                {formatAmount(
                  fromMinor(row.cash_out_minor, row.currency_code),
                  row.currency_code
                )}
              </TableCell>
              <TableCell className="px-3 py-2 text-right font-medium tabular-nums">
                {formatAmount(
                  fromMinor(row.net_minor, row.currency_code),
                  row.currency_code
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
