import { useI18n } from "@workspace/i18n"
import { formatAmount, formatDateShort, formatDateTime, fromMinor } from "@workspace/format"
import { DocCode } from "@workspace/ui/components/doc-code"
import { KeyFigures } from "@workspace/ui/components/key-figures"
import { PropertyList } from "@workspace/ui/components/property-list"
import { RecordSheet } from "@workspace/ui/components/record-sheet"
import { StatusBadge } from "@workspace/ui/components/status-badge"
import { CaseApprovalTrail } from "@workspace/case-tabs/case-approval-trail"
import { formatEntryNo } from "@workspace/posting-flow/choose-transaction-dialog"
import type { JournalEntry } from "../api"

type SheetState = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPrev?: () => void
  onNext?: () => void
  position?: string
}

/**
 * Quick look at one posting from a case list: the journal row itself
 * (no extra fetch — PENDING/VOID entries are not readable by entry no)
 * plus the case's maker → checker → posting trail.
 */
export function PostingCaseSheet({
  record,
  sheet,
  statusLabels,
}: {
  record: JournalEntry | undefined
  sheet: SheetState
  statusLabels: Record<string, string>
}) {
  const { t } = useI18n()
  if (!record) return null
  const currency = record.currency_code
  const entryNo = formatEntryNo(record.entry_no)

  return (
    <RecordSheet
      {...sheet}
      title={record.description || entryNo}
      docCode={<DocCode code={record.document_code || entryNo} />}
      badges={
        <StatusBadge status={record.status}>
          {statusLabels[record.status] ?? record.status}
        </StatusBadge>
      }
      subtitle={`${t("finance.journal.field.accounting_date")}: ${formatDateShort(record.accounting_date)}`}
    >
      <div className="space-y-5">
        <KeyFigures
          className="md:grid-cols-2 xl:grid-cols-2"
          items={[
            {
              label: t("finance.posting.sheet.total"),
              value:
                record.total_amount_minor === undefined
                  ? "—"
                  : formatAmount(fromMinor(record.total_amount_minor, currency), currency),
              hint: currency,
            },
            { label: t("finance.journal.field.entry_no"), value: entryNo },
          ]}
        />
        <PropertyList
          items={[
            { label: t("finance.journal.field.document_type"), value: record.document_type },
            {
              label: t("finance.posting.col.document_code"),
              value: record.document_code ? (
                <span className="font-mono text-xs">{record.document_code}</span>
              ) : undefined,
            },
            { label: t("finance.journal.field.description"), value: record.description || undefined },
            { label: t("finance.journal.field.business_domain"), value: record.business_domain },
            {
              label: t("finance.posting.sheet.case"),
              value: record.case_id ? (
                <span className="font-mono text-xs">{record.case_id}</span>
              ) : undefined,
            },
            { label: t("common.field.created"), value: formatDateTime(record.created_at) },
          ]}
        />
        {record.case_id ? (
          <section className="space-y-3">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("common.approval.label")}
            </h3>
            <CaseApprovalTrail
              caseId={record.case_id}
              finalLabel={t("finance.posting.lifecycle.posted")}
            />
          </section>
        ) : null}
      </div>
    </RecordSheet>
  )
}
