import { CheckCircle2 } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { formatAmount, formatDateShort, formatDateTime, fromMinor } from "@workspace/format"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DocCode } from "@workspace/ui/components/doc-code"
import { KeyFigures } from "@workspace/ui/components/key-figures"
import { PropertyList } from "@workspace/ui/components/property-list"
import { RecordSheet } from "@workspace/ui/components/record-sheet"
import { StatusBadge } from "@workspace/ui/components/status-badge"
import type { LoanDisbursement } from "../api"
import { caseDisplayLabel } from "../case-display"
import { CaseApprovalTrail } from "@workspace/case-tabs/case-approval-trail"

type SheetState = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPrev?: () => void
  onNext?: () => void
  position?: string
}

const mono = (value: string | null | undefined) =>
  value ? <span className="font-mono text-xs">{value}</span> : undefined

/** Quick look at one disbursement from the list: amount, links, submit. */
export function DisbursementSheet({
  record,
  sheet,
  statusLabels,
  flowLabels,
  onSubmit,
}: {
  record: LoanDisbursement | undefined
  sheet: SheetState
  statusLabels: Record<string, string>
  flowLabels: Record<string, string>
  onSubmit: (item: LoanDisbursement) => void
}) {
  const { t } = useI18n()
  if (!record) return null
  const currency = record.currency_code
  const flow = record.flow_type === "COMPLETE" ? "COMPLETE" : "REGISTER"

  return (
    <RecordSheet
      {...sheet}
      title={record.contract_code}
      docCode={<DocCode code={record.agreement_code} />}
      badges={
        <>
          <StatusBadge status={record.status}>
            {statusLabels[record.status] ?? record.status}
          </StatusBadge>
          {record.is_closed ? (
            <Badge variant="outline">{t("loan.disbursements.field.closes_contract")}</Badge>
          ) : null}
        </>
      }
      subtitle={`${t("loan.disbursements.field.flow_type")}: ${flowLabels[flow] ?? flow}`}
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
            {
              label: t("loan.disbursements.field.amount"),
              value: formatAmount(fromMinor(record.disburse_amt_minor, currency), currency),
              hint: currency,
            },
            {
              label: t("loan.disbursements.field.disburse_date"),
              value: formatDateShort(record.disburse_date),
            },
          ]}
        />
        <PropertyList
          items={[
            { label: t("loan.field.contract_code"), value: record.contract_code },
            { label: t("loan.field.agreement_code"), value: mono(record.agreement_code) },
            { label: t("loan.disbursements.field.fund_source"), value: mono(record.fund_source_code) },
            ...(flow === "COMPLETE"
              ? [
                  {
                    label: t("loan.disbursements.field.source_register"),
                    value: mono(record.source_register_id),
                  },
                ]
              : []),
            { label: t("loan.field.org_unit"), value: record.org_code },
            {
              label: t("loan.field.case"),
              value: caseDisplayLabel(record.workflow_case_code, record.workflow_case_id ?? undefined),
            },
            { label: t("loan.disbursements.field.batch"), value: mono(record.batch_id) },
            { label: t("loan.disbursements.field.journal_entry"), value: mono(record.journal_entry_id) },
            { label: t("loan.field.created_at"), value: formatDateTime(record.created_at) },
            { label: t("loan.disbursements.control.created_by"), value: record.created_by },
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
