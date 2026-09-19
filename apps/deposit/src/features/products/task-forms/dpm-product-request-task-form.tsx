import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { formatRatePercent } from "@workspace/format"
import {
  TaskDecisionBar,
  useTaskDecision,
  type TaskDecisionLabels,
  type TaskFormProps,
} from "@workspace/workflow-task"
import { depositApi, type ProductRequest } from "../../api"

/**
 * DPM.102/103 product register/edit — the checker sees the staged payload from
 * the domain read API (`GET /api/deposit/product-requests/{id}`) plus the row
 * version they are approving, then approves / requests changes / rejects.
 */
export function DpmProductRequestTaskForm({
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
    typeof data?.productRequestId === "string" && data.productRequestId.trim()
      ? data.productRequestId.trim()
      : typeof data?.product_request_id === "string" &&
          data.product_request_id.trim()
        ? data.product_request_id.trim()
        : (task.primaryObjectId ?? "")

  const [request, setRequest] = useState<ProductRequest | null>(null)
  useEffect(() => {
    if (!requestId) return
    let cancelled = false
    depositApi
      .getProductRequest(requestId)
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
    commentRequiredLabel: t("deposit.product_task_form.comment_required"),
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
    commentLabel: t("deposit.product_task_form.comment_label"),
    commentPlaceholder: t("deposit.product_task_form.comment_placeholder"),
    close: t("common.action.close"),
    confirm: t("deposit.product_task_form.action.confirm"),
    approve: t("deposit.product_task_form.action.approve"),
    requestChanges: t("deposit.product_task_form.action.request_changes"),
    reject: t("deposit.product_task_form.action.reject"),
    viewOnly: t("deposit.product_task_form.view_only"),
    commentRequired: t("deposit.product_task_form.comment_required"),
  }

  const rows: Array<{ label: string; value: string }> = request
    ? [
        {
          label: t("deposit.product_task_form.field.request_type"),
          value: t(
            `deposit.product_task_form.request_type.${request.request_type.toLowerCase()}`
          ),
        },
        {
          label: t("deposit.product_task_form.field.product_code"),
          value: request.product_code,
        },
        {
          label: t("deposit.product_task_form.field.name"),
          value: request.name,
        },
        {
          label: t("deposit.product_task_form.field.term_months"),
          value: String(request.term_months),
        },
        {
          label: t("deposit.product_task_form.field.interest_rate"),
          value: formatRatePercent(request.interest_rate),
        },
        {
          label: t("deposit.product_task_form.field.currency"),
          value: request.currency_code,
        },
        {
          label: t("deposit.product_task_form.field.status"),
          value: t(
            `deposit.product_task_form.status.${request.status.toLowerCase()}`
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
          {t("deposit.product_task_form.loading")}
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
