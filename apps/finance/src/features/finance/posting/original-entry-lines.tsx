import { useI18n } from "@workspace/i18n"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { formatAmount, fromMinor } from "@workspace/format"
import type { JournalEntryDetail } from "../api"

/** Label key per document_type shown in the "Loại phát sinh" column. */
const DOCUMENT_TYPE_LABEL_KEY: Record<string, string> = {
  FIN_SINGLE_ENTRY: "finance.posting.single.title",
  FIN_DOUBLE_ENTRY: "finance.posting.double.title",
  FIN_OFF_BALANCE: "finance.posting.off_balance.title",
  FIN_TXN_CANCEL: "finance.posting.cancellation.title",
}

function formatLineAmount(minor: number, currency?: string): string {
  return formatAmount(fromMinor(minor, currency ?? "VND"), currency ?? "VND")
}

/**
 * Read-only bút toán of the original transaction (FAC.300.01 tab 2) — EPAS
 * columns: Loại phát sinh / Nợ-Có / TK / Số tiền / Diễn giải. Fed from
 * `GET /api/finance/journal-entries/{entry_no}`; renders empty states for
 * "no reference selected", loading and an entry without lines.
 */
export function OriginalEntryLines({
  detail,
  isLoading,
}: {
  detail: JournalEntryDetail | null
  isLoading: boolean
}) {
  const { t } = useI18n()
  const lines = detail?.lines ?? []

  if (!detail && !isLoading) {
    return (
      <div className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">
        {t("finance.posting.cancellation.no_reference")}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">{t("finance.posting.cancellation.col_line_type")}</TableHead>
            <TableHead className="w-28">{t("finance.posting.col.direction")}</TableHead>
            <TableHead className="w-40">{t("finance.posting.col.account")}</TableHead>
            <TableHead className="w-44 text-right">{t("finance.posting.col.amount")}</TableHead>
            <TableHead>{t("finance.posting.col.description")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                …
              </TableCell>
            </TableRow>
          ) : lines.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                {t("finance.posting.cancellation.empty_lines")}
              </TableCell>
            </TableRow>
          ) : (
            lines.map((line) => (
              <TableRow key={line.line_no}>
                <TableCell className="text-xs text-muted-foreground">
                  {detail?.document_type
                    ? (DOCUMENT_TYPE_LABEL_KEY[detail.document_type]
                      ? t(DOCUMENT_TYPE_LABEL_KEY[detail.document_type])
                      : detail.document_type)
                    : "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {line.direction === "DEBIT"
                    ? t("finance.entry.debit")
                    : t("finance.entry.credit")}
                </TableCell>
                <TableCell className="font-mono text-xs">{line.account_code}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatLineAmount(line.amount_minor, line.currency_code ?? detail?.currency_code)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {line.description || "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
