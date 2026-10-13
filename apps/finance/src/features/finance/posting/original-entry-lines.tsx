import { useI18n } from "@workspace/i18n"
import { LedgerTable } from "@workspace/ui/components/ledger-table"
import type { JournalEntryDetail } from "../api"

/** Label key per document_type shown in the "Loại phát sinh" column. */
const DOCUMENT_TYPE_LABEL_KEY: Record<string, string> = {
  FIN_SINGLE_ENTRY: "finance.posting.single.title",
  FIN_DOUBLE_ENTRY: "finance.posting.double.title",
  FIN_OFF_BALANCE: "finance.posting.off_balance.title",
  FIN_TXN_CANCEL: "finance.posting.cancellation.title",
}

/**
 * Read-only bút toán of the original transaction (FAC.300.01 tab 2) as a
 * ledger: Nợ / Có columns, totals and balance chip; the document type
 * (EPAS "Loại phát sinh") is the caption. Fed from
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

  const docType = detail?.business_doc_type
  return (
    <LedgerTable
      currency={detail?.currency_code ?? "VND"}
      loading={isLoading}
      emptyText={t("finance.posting.cancellation.empty_lines")}
      caption={
        docType
          ? `${t("finance.posting.cancellation.col_line_type")}: ${
              DOCUMENT_TYPE_LABEL_KEY[docType] ? t(DOCUMENT_TYPE_LABEL_KEY[docType]) : docType
            }`
          : undefined
      }
      lines={lines.map((line) => ({
        key: line.line_no,
        lineNo: line.line_no,
        direction: line.direction,
        accountCode: line.account_code,
        amountMinor: line.amount_minor,
        description: line.description,
      }))}
    />
  )
}
