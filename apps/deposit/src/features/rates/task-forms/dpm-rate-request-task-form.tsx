import { useEffect, useState } from "react"
import { Check, MessageSquareWarning, X } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { formatDateShort, formatRatePercent } from "@workspace/format"
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
  const [comment, setComment] = useState("")
  const [error, setError] = useState("")

  const maker = isMakerStep(task)
  const readOnly = mode === "view"
  const serverActions = allowedActions(task)
  const actions: WorkflowTaskAction[] = serverActions.length
    ? serverActions
    : maker
      ? [TASK_ACTIONS.submit]
      : [TASK_ACTIONS.approve, TASK_ACTIONS.requestChanges, TASK_ACTIONS.reject]

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

  function submit(action: WorkflowTaskAction) {
    const trimmed = comment.trim()
    if (requiresComment(task, action) && !trimmed) {
      setError(t("deposit.rate_task_form.comment_required"))
      return
    }
    setError("")
    const dataVersion =
      request?.data_version != null ? String(request.data_version) : undefined
    void onSubmit({
      action,
      comment: trimmed,
      variables: dataVersion ? { dataVersion } : undefined,
    })
  }

  function actionButton(action: WorkflowTaskAction) {
    const disabled = submitting || readOnly
    switch (action) {
      case TASK_ACTIONS.submit:
        return (
          <Button
            key={action}
            type="button"
            disabled={disabled}
            onClick={() => submit(action)}
          >
            <Check className="size-4" />
            {t("deposit.rate_task_form.action.confirm")}
          </Button>
        )
      case TASK_ACTIONS.approve:
        return (
          <Button
            key={action}
            type="button"
            disabled={disabled}
            onClick={() => submit(action)}
          >
            <Check className="size-4" />
            {t("deposit.rate_task_form.action.approve")}
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
            {t("deposit.rate_task_form.action.request_changes")}
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
            {t("deposit.rate_task_form.action.reject")}
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

      {!maker && !readOnly ? (
        <div className="space-y-1.5">
          <Label htmlFor="dpm-rate-request-comment">
            {t("deposit.rate_task_form.comment_label")}
          </Label>
          <Textarea
            id="dpm-rate-request-comment"
            rows={3}
            value={comment}
            disabled={submitting}
            placeholder={t("deposit.rate_task_form.comment_placeholder")}
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
          {t("deposit.rate_task_form.view_only")}
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
