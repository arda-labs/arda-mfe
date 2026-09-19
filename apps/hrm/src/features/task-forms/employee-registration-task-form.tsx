import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Label } from "@workspace/ui/components/label"
import {
  TaskDecisionBar,
  useTaskDecision,
  type TaskDecisionLabels,
  type TaskFormProps,
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
  const [detail, setDetail] = useState<EmployeeRegistration | null>(null)

  const readOnly = mode === "view"
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

  const decision = useTaskDecision({
    task,
    commentRequiredLabel: t("hrm.task_form.comment_required"),
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
    commentLabel: t("hrm.task_form.comment_label"),
    commentPlaceholder: t("hrm.task_form.comment_placeholder"),
    close: t("common.action.close"),
    confirm: t("hrm.task_form.action.confirm"),
    approve: t("hrm.task_form.action.approve"),
    requestChanges: t("hrm.task_form.action.request_changes"),
    reject: t("hrm.task_form.action.reject"),
    viewOnly: t("hrm.task_form.view_only"),
    commentRequired: t("hrm.task_form.comment_required"),
  }

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
