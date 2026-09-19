import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { formatDateShort, formatRatePercent } from "@workspace/format"
import {
  TaskDecisionBar,
  useTaskDecision,
  type TaskDecisionLabels,
  type TaskFormProps,
} from "@workspace/workflow-task"
import { depositApi, type RateRequest } from "../../api"

/**
 * DPM.100/101 rate register/adjust — the checker sees the staged payload from
 * the domain read API (`GET /api/deposit/rates/{id}`) plus the row version they
 * are approving, then approves / requests changes / rejects.
 */
export function DpmRateRequestTaskForm({
  task,
  mode,
  data,
  submitting,
  onSubmit,
  onReturn,
}: TaskFormProps) {
  const { t } = useI18n()

  const readOnly = mode === "view"

  const requestId =
    typeof data?.requestId === "string" && data.requestId.trim()
      ? data.requestId.trim()
      : typeof data?.request_id === "string" && data.request_id.trim()
        ? data.request_id.trim()
        : (task.primaryObjectId ?? "")

  const [request, setRequest] = useState<RateRequest | null>(null)
  useEffect(() => {
    if (!requestId) return
    let cancelled = false
    depositApi
      .getRateRequest(requestId)
      .then((value) => {
        if (!cancelled) setRequest(value)
      })
      .catch(() => {
        // Preview only — the decision still goes through the domain guard.
      })
    return () => {
      cancelled = true
    }
  }, [requestId])

  const decision = useTaskDecision({
    task,
    commentRequiredLabel: t("deposit.rate_task_form.comment_required"),
    onSubmit: (action, comment) =>
      onSubmit({
        action,
        comment,
        variables:
          request?.data_version != null
            ? { dataVersion: String(request.data_version) }
            : undefined,
      }),
  })

  const labels: TaskDecisionLabels = {
    commentLabel: t("deposit.rate_task_form.comment_label"),
    commentPlaceholder: t("deposit.rate_task_form.comment_placeholder"),
    close: t("common.action.close"),
    confirm: t("deposit.rate_task_form.action.confirm"),
    approve: t("deposit.rate_task_form.action.approve"),
    requestChanges: t("deposit.rate_task_form.action.request_changes"),
    reject: t("deposit.rate_task_form.action.reject"),
    viewOnly: t("deposit.rate_task_form.view_only"),
    commentRequired: t("deposit.rate_task_form.comment_required"),
  }

  const payload = request?.payload
  const rows: Array<{ label: string; value: string }> = request
    ? [
        {
          label: t("deposit.rate_task_form.field.request_type"),
          value: t(
            `deposit.rate_task_form.request_type.${request.request_type.toLowerCase()}`
          ),
        },
        {
          label: t("deposit.rate_task_form.field.product_code"),
          value: payload?.product_code || "—",
        },
        {
          label: t("deposit.rate_task_form.field.term_months"),
          value: payload?.term_months != null ? String(payload.term_months) : "—",
        },
        {
          label: t("deposit.rate_task_form.field.rate"),
          value:
            payload?.rate != null ? formatRatePercent(payload.rate) : "—",
        },
        {
          label: t("deposit.rate_task_form.field.effective_from"),
          value: payload?.effective_from
            ? formatDateShort(payload.effective_from)
            : "—",
        },
        {
          label: t("deposit.rate_task_form.field.status"),
          value: t(
            `deposit.rate_task_form.status.${request.status.toLowerCase()}`
          ),
        },
      ]
    : []

  return (
    <div className="space-y-4">
      {rows.length > 0 ? (
        <dl className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="space-y-0.5">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {t("deposit.rate_task_form.loading")}
        </p>
      )}

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
