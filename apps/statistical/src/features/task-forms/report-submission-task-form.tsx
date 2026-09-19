import { useEffect, useState } from "react"
import { Check, MessageSquareWarning, X } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { formatDateShort } from "@workspace/format"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  allowedActions,
  isMakerStep,
  requiresComment,
  TASK_ACTIONS,
  type TaskFormProps,
  type WorkflowTaskAction,
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
  const [comment, setComment] = useState("")
  const [error, setError] = useState("")
  const [detail, setDetail] = useState<ReportSubmission | null>(null)

  const maker = isMakerStep(task)
  const readOnly = mode === "view"
  const serverActions = allowedActions(task)
  const actions: WorkflowTaskAction[] = serverActions.length
    ? serverActions
    : maker
      ? [TASK_ACTIONS.submit]
      : [TASK_ACTIONS.approve, TASK_ACTIONS.requestChanges, TASK_ACTIONS.reject]

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
        value: detail.submitted_at
          ? formatDateShort(detail.submitted_at)
          : "—",
      }
    )
  }

  const payload =
    detail?.payload && Object.keys(detail.payload).length > 0
      ? JSON.stringify(detail.payload, null, 2)
      : ""

  function submit(action: WorkflowTaskAction) {
    const trimmed = comment.trim()
    if (requiresComment(task, action) && !trimmed) {
      setError(t("statistical.task_form.comment_required"))
      return
    }
    setError("")
    void onSubmit({
      action,
      comment: trimmed,
      variables:
        detail?.data_version != null
          ? { dataVersion: String(detail.data_version) }
          : undefined,
    })
  }

  function actionButton(action: WorkflowTaskAction) {
    const disabled = submitting || readOnly
    switch (action) {
      case TASK_ACTIONS.submit:
      case TASK_ACTIONS.approve:
        return (
          <Button
            key={action}
            type="button"
            disabled={disabled}
            onClick={() => submit(action)}
          >
            <Check className="size-4" />
            {t(
              action === TASK_ACTIONS.submit
                ? "statistical.task_form.action.confirm"
                : "statistical.task_form.action.approve"
            )}
          </Button>
        )
      case TASK_ACTIONS.requestChanges:
        return (
          <Button
            key={action}
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => submit(action)}
          >
            <MessageSquareWarning className="size-4" />
            {t("statistical.task_form.action.request_changes")}
          </Button>
        )
      case TASK_ACTIONS.reject:
        return (
          <Button
            key={action}
            type="button"
            variant="destructive"
            disabled={disabled}
            onClick={() => submit(action)}
          >
            <X className="size-4" />
            {t("statistical.task_form.action.reject")}
          </Button>
        )
      default:
        return null
    }
  }

  const orderedActions = [
    ...actions.filter((action) => action === TASK_ACTIONS.requestChanges),
    ...actions.filter((action) => action === TASK_ACTIONS.reject),
    ...actions.filter(
      (action) =>
        action !== TASK_ACTIONS.requestChanges && action !== TASK_ACTIONS.reject
    ),
  ]

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

      {!maker && !readOnly ? (
        <div className="space-y-1.5">
          <Label htmlFor="rpt-task-comment">
            {t("statistical.task_form.comment_label")}
          </Label>
          <Textarea
            id="rpt-task-comment"
            rows={3}
            value={comment}
            disabled={submitting}
            placeholder={t("statistical.task_form.comment_placeholder")}
            onChange={(event) => {
              setComment(event.target.value)
              setError("")
            }}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      ) : null}

      {readOnly ? (
        <p className="text-sm text-muted-foreground">
          {t("statistical.task_form.view_only")}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={onReturn}
        >
          {t("common.action.close")}
        </Button>
        {readOnly ? null : orderedActions.map(actionButton)}
      </div>
    </div>
  )
}
