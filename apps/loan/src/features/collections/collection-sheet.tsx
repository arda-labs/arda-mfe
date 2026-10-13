import { CheckCircle2 } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { formatAmount, formatDateShort, formatDateTime, fromMinor } from "@workspace/format"
import { Button } from "@workspace/ui/components/button"
import { DocCode } from "@workspace/ui/components/doc-code"
import { KeyFigures } from "@workspace/ui/components/key-figures"
import { PropertyList } from "@workspace/ui/components/property-list"
import { RecordSheet } from "@workspace/ui/components/record-sheet"
import { StatusBadge } from "@workspace/ui/components/status-badge"
import type { LoanCollection } from "../api"
import { caseDisplayLabel } from "../case-display"
import { CaseApprovalTrail } from "@workspace/case-tabs/case-approval-trail"

type SheetState = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPrev?: () => void
  onNext?: () => void
  position?: string
}

/** Quick look at one collection from the list: amounts, links, submit. */
export function CollectionSheet({
  record,
  sheet,
  statusLabels,
  onSubmit,
}: {
  record: LoanCollection | undefined
  sheet: SheetState
  statusLabels: Record<string, string>
  onSubmit: (item: LoanCollection) => void
}) {
  const { t } = useI18n()
  if (!record) return null
  const currency = record.currency_code
  const money = (minor: number | null | undefined) =>
    formatAmount(fromMinor(minor ?? 0, currency), currency)
  const total =
    record.principal_minor + record.interest_minor + (record.overdue_interest_minor ?? 0)

  return (
    <RecordSheet
      {...sheet}
      title={record.contract_code}
      docCode={<DocCode code={record.agreement_code} />}
      badges={
        <StatusBadge status={record.status}>
          {statusLabels[record.status] ?? record.status}
        </StatusBadge>
      }
      subtitle={`${t("loan.collections.field.collection_date")}: ${formatDateShort(record.collection_date)}`}
      actions={
        record.status === "DRAFT" ? (
          <Button type="button" size="sm" onClick={() => onSubmit(record)}>
            <CheckCircle2 />
            {t("loan.submit")}
          </Button>
        ) : null
      }
    >
      <div className="space-y-5">
        <KeyFigures
          className="md:grid-cols-2 xl:grid-cols-2"
          items={[
            { label: t("loan.collections.field.principal"), value: money(record.principal_minor) },
            { label: t("loan.collections.field.interest"), value: money(record.interest_minor) },
            {
              label: t("loan.collections.field.overdue_interest"),
              value: money(record.overdue_interest_minor),
            },
            { label: t("loan.collections.field.total"), value: money(total), hint: currency },
          ]}
        />
        <PropertyList
          items={[
            { label: t("loan.field.contract_code"), value: record.contract_code },
            {
              label: t("loan.field.agreement_code"),
              value: <span className="font-mono text-xs">{record.agreement_code}</span>,
            },
            { label: t("loan.field.org_unit"), value: record.org_code },
            {
              label: t("loan.field.case"),
              value: caseDisplayLabel(record.workflow_case_code, record.workflow_case_id ?? undefined),
            },
            {
              label: t("loan.collections.field.journal_entry"),
              value: record.journal_entry_id ? (
                <span className="font-mono text-xs">{record.journal_entry_id}</span>
              ) : undefined,
            },
            { label: t("loan.field.created_at"), value: formatDateTime(record.created_at) },
            { label: t("loan.collections.field.created_by"), value: record.created_by },
          ]}
        />
        {record.workflow_case_id ? (
          <section className="space-y-3">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("common.approval.label")}
            </h3>
            <CaseApprovalTrail caseId={record.workflow_case_id} />
          </section>
        ) : null}
      </div>
    </RecordSheet>
  )
}
