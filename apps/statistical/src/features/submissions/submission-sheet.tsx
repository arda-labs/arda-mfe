import { CheckCircle2, Eye } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { formatDateTime } from "@workspace/format"
import { Button } from "@workspace/ui/components/button"
import { DocCode } from "@workspace/ui/components/doc-code"
import { LifecycleSteps } from "@workspace/ui/components/lifecycle-steps"
import { PropertyList } from "@workspace/ui/components/property-list"
import { RecordSheet } from "@workspace/ui/components/record-sheet"
import { StatusBadge } from "@workspace/ui/components/status-badge"
import type { ReportSubmission } from "../api"
import { submissionLifecycle } from "./submission-lifecycle"

type SheetState = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPrev?: () => void
  onNext?: () => void
  position?: string
}

const mono = (value: string | undefined) =>
  value ? <span className="font-mono text-xs">{value}</span> : undefined

/** Quick look at one report submission from the list: lifecycle, submit. */
export function SubmissionSheet({
  record,
  sheet,
  statusLabels,
  onSubmit,
  onOpenDetail,
}: {
  record: ReportSubmission | undefined
  sheet: SheetState
  statusLabels: Record<string, string>
  onSubmit: (item: ReportSubmission) => void
  onOpenDetail: (item: ReportSubmission) => void
}) {
  const { t } = useI18n()
  if (!record) return null

  return (
    <RecordSheet
      {...sheet}
      title={t("statistical.submissions.sheet_title", { period: record.period_code })}
      docCode={<DocCode code={record.report_code} />}
      badges={
        <StatusBadge status={record.status}>
          {statusLabels[record.status] ?? record.status}
        </StatusBadge>
      }
      actions={
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenDetail(record)}>
            <Eye />
            {t("common.action.detail")}
          </Button>
          {record.status === "DRAFT" ? (
            <Button type="button" size="sm" onClick={() => onSubmit(record)}>
              <CheckCircle2 />
              {t("statistical.submissions.submit")}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-5">
        <LifecycleSteps
          label={t("statistical.submissions.lifecycle_label")}
          steps={submissionLifecycle(record.status).map((step) => ({
            id: step.status,
            label: statusLabels[step.status] ?? step.status,
            state: step.state,
          }))}
        />
        <PropertyList
          items={[
            { label: t("statistical.submissions.field.report"), value: mono(record.report_code) },
            { label: t("statistical.submissions.field.period"), value: record.period_code },
            { label: t("statistical.submissions.field.submitted_by"), value: record.submitted_by },
            {
              label: t("statistical.submissions.field.submitted_at"),
              value: record.submitted_at ? formatDateTime(record.submitted_at) : undefined,
            },
            { label: t("statistical.submissions.field.case"), value: mono(record.workflow_case_id) },
            { label: t("statistical.submissions.field.created_by"), value: record.created_by },
            {
              label: t("common.field.created"),
              value: record.created_at ? formatDateTime(record.created_at) : undefined,
            },
          ]}
        />
      </div>
    </RecordSheet>
  )
}
