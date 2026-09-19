import { useEffect, useState } from "react"
import { Check, MessageSquareWarning, X } from "lucide-react"
import { useI18n } from "@workspace/i18n"
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
import { hrmApi, type EmployeeRegistration } from "../api"

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

function payloadPreview(payload: EmployeeRegistration["payload"]): string {
  if (typeof payload === "string") {
    try {
      const parsed: unknown = JSON.parse(payload)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return payload
    }
  }
  return JSON.stringify(payload, null, 2)
}

/**
 * HRM_EMPLOYEE_REGISTRATION task form: the employee-registration dossier from
 * the hrm read API (registration code, status and the staged payload preview).
 * The row version the checker saw is sent back as `dataVersion` so the domain
 * can refuse a stale approval.
 */
export function EmployeeRegistrationTaskForm({
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
  const [detail, setDetail] = useState<EmployeeRegistration | null>(null)

  const maker = isMakerStep(task)
  const readOnly = mode === "view"
  const serverActions = allowedActions(task)
  const actions: WorkflowTaskAction[] = serverActions.length
    ? serverActions
    : maker
      ? [TASK_ACTIONS.submit]
      : [TASK_ACTIONS.approve, TASK_ACTIONS.requestChanges, TASK_ACTIONS.reject]

  const registrationId =
    pick(data, ["employeeRegistrationId", "employee_registration_id"]) ??
    task.primaryObjectId ??
    ""

  useEffect(() => {
    if (!registrationId) return
    let cancelled = false
    hrmApi
      .getEmployeeRegistration(registrationId)
      .then((value) => {
        if (!cancelled) setDetail(value)
      })
      .catch(() => {
        // Preview only — the decision still goes through the domain guard.
      })
    return () => {
      cancelled = true
    }
  }, [registrationId])

  const statusLabel = (status?: string) =>
    status ? t(`hrm.task_form.status.${status.toLowerCase()}`) : "—"

  const rows: Array<{ label: string; value: string }> = []
  if (detail) {
    rows.push(
      {
        label: t("hrm.task_form.field.registration_code"),
        value: detail.registration_code,
      },
      {
        label: t("hrm.task_form.field.status"),
        value: statusLabel(detail.status),
      }
    )
  }

  const payload = detail ? payloadPreview(detail.payload) : ""

  function submit(action: WorkflowTaskAction) {
    const trimmed = comment.trim()
    if (requiresComment(task, action) && !trimmed) {
      setError(t("hrm.task_form.comment_required"))
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
                ? "hrm.task_form.action.confirm"
                : "hrm.task_form.action.approve"
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
            {t("hrm.task_form.action.request_changes")}
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
            {t("hrm.task_form.action.reject")}
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
          {t("hrm.task_form.loading")}
        </p>
      )}

      {payload && payload !== "{}" ? (
        <div className="space-y-1.5">
          <Label>{t("hrm.task_form.field.payload")}</Label>
          <pre className="max-h-56 overflow-auto rounded-md border bg-muted/20 p-3 text-xs">
            {payload}
          </pre>
        </div>
      ) : null}

      {!maker && !readOnly ? (
        <div className="space-y-1.5">
          <Label htmlFor="hrm-task-comment">
            {t("hrm.task_form.comment_label")}
          </Label>
          <Textarea
            id="hrm-task-comment"
            rows={3}
            value={comment}
            disabled={submitting}
            placeholder={t("hrm.task_form.comment_placeholder")}
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
          {t("hrm.task_form.view_only")}
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
