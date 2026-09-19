import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { formatDateShort } from "@workspace/format"
import { Label } from "@workspace/ui/components/label"
import {
  TaskDecisionBar,
  useTaskDecision,
  type TaskDecisionLabels,
  type TaskFormProps,
} from "@workspace/workflow-task"
import { statisticalApi, type ReportSubmission } from "../api"

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function pick(
  data: Record<string, unknown> | undefined,
  keys: string[]
): string | undefined {
  if (!data) return undefined
  for (const key of keys) {
    const value = text(data[key])
    if (value) return value
  }
  return undefined
}

/**
 * RPT_SUBMIT_V2 task form: the report submission dossier from the statistical
 * read API (report/period/status + the staged payload preview). The row version
 * the checker saw is sent back as `dataVersion` so the domain can refuse a
 * stale approval.
 */
export function ReportSubmissionTaskForm({
  task,
  mode,
  data,
  submitting,
  onSubmit,
  onReturn,
}: TaskFormProps) {
  const { t } = useI18n()
  const [detail, setDetail] = useState<ReportSubmission | null>(null)

  const readOnly = mode === "view"
  const submissionId =
    pick(data, ["submissionId", "submission_id"]) ?? task.primaryObjectId ?? ""

  useEffect(() => {
    if (!submissionId) return
    let cancelled = false
    statisticalApi
      .getSubmission(submissionId)
      .then((value) => {
        if (!cancelled) setDetail(value)
      })
      .catch(() => {
        // Preview only — the decision still goes through the domain guard.
      })
    return () => {
      cancelled = true
    }
  }, [submissionId])

  const decision = useTaskDecision({
    task,
    commentRequiredLabel: t("statistical.task_form.comment_required"),
    onSubmit: (action, comment) =>
      onSubmit({
        action,
        comment,
        variables:
          detail?.data_version != null
            ? { dataVersion: String(detail.data_version) }
            : undefined,
      }),
  })

  const labels: TaskDecisionLabels = {
    commentLabel: t("statistical.task_form.comment_label"),
    commentPlaceholder: t("statistical.task_form.comment_placeholder"),
    close: t("common.action.close"),
    confirm: t("statistical.task_form.action.confirm"),
    approve: t("statistical.task_form.action.approve"),
    requestChanges: t("statistical.task_form.action.request_changes"),
    reject: t("statistical.task_form.action.reject"),
    viewOnly: t("statistical.task_form.view_only"),
    commentRequired: t("statistical.task_form.comment_required"),
  }

  const statusLabel = (status?: string) =>
    status ? t(`statistical.task_form.status.${status.toUpperCase()}`) : "—"

  const rows: Array<{ label: string; value: string }> = []
  if (detail) {
    rows.push(
      {
        label: t("statistical.task_form.field.report_code"),
        value: detail.report_code,
      },
      {
        label: t("statistical.task_form.field.period_code"),
        value: detail.period_code,
      },
      {
        label: t("statistical.task_form.field.status"),
        value: statusLabel(detail.status),
      },
      {
        label: t("statistical.task_form.field.submitted_by"),
        value: detail.submitted_by || "—",
      },
      {
        label: t("statistical.task_form.field.submitted_at"),
        value: detail.submitted_at ? formatDateShort(detail.submitted_at) : "—",
      }
    )
  }

  const payload =
    detail?.payload && Object.keys(detail.payload).length > 0
      ? JSON.stringify(detail.payload, null, 2)
      : ""

  return (
    <div className="space-y-4">
      {rows.length > 0 ? (
        <dl className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3 text-sm">
          {rows.map((row, index) => (
            <div key={`${row.label}-${index}`} className="space-y-0.5">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {t("statistical.task_form.loading")}
        </p>
      )}

      {payload ? (
        <div className="space-y-1.5">
          <Label>{t("statistical.task_form.field.payload")}</Label>
          <pre className="max-h-56 overflow-auto rounded-md border bg-muted/20 p-3 text-xs">
            {payload}
          </pre>
        </div>
      ) : null}

      <TaskDecisionBar
        actions={decision.actions}
        labels={labels}
        readOnly={readOnly}
        submitting={submitting}
        showComment={!decision.maker}
        comment={decision.comment}
        onCommentChange={decision.setComment}
        commentError={decision.error}
        onSubmit={decision.submit}
        onReturn={onReturn}
      />
    </div>
  )
}
