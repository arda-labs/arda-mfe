import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import {
  formatAmount,
  formatDateShort,
  formatRatePercent,
  fromMinor,
} from "@workspace/format"
import {
  TaskDecisionBar,
  useTaskDecision,
  type TaskDecisionLabels,
  type TaskFormProps,
} from "@workspace/workflow-task"
import { depositApi, type IbmDetail } from "../../api"

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
 * IBM (interbank) task forms: DPM interbank place (IBM_PLACE_V1) and the four
 * movement kinds (IBM_TOP_UP/INTEREST/EXPECTED/WITHDRAW_V1). The dossier comes
 * from the domain read API (`GET /api/deposit/interbank/{id}`) — contract
 * context plus the staged movement — and the row version is sent back so the
 * domain can refuse a stale approval.
 */
export function IbmTaskForm({
  task,
  mode,
  data,
  submitting,
  onSubmit,
  onReturn,
  variant = "movement",
}: TaskFormProps & { variant?: "place" | "movement" }) {
  const { t } = useI18n()
  const [detail, setDetail] = useState<IbmDetail | null>(null)

  const readOnly = mode === "view"
  const depositId =
    pick(data, ["depositId", "deposit_id"]) ?? task.primaryObjectId ?? ""
  const movementId = pick(data, ["movementId", "movement_id"])
  const kind = pick(data, ["kind"])?.toUpperCase()

  useEffect(() => {
    if (!depositId) return
    let cancelled = false
    depositApi
      .getInterbank(depositId)
      .then((value) => {
        if (!cancelled) setDetail(value)
      })
      .catch(() => {
        // Preview only — the decision still goes through the domain guard.
      })
    return () => {
      cancelled = true
    }
  }, [depositId])

  const deposit = detail?.deposit ?? null
  const movement =
    variant === "movement" && movementId
      ? detail?.movements?.find((item) => item.id === movementId)
      : undefined
  const movementKind = (kind ?? movement?.kind)?.toUpperCase()

  const decision = useTaskDecision({
    task,
    commentRequiredLabel: t("deposit.ibm_task_form.comment_required"),
    onSubmit: (action, comment) =>
      onSubmit({
        action,
        comment,
        variables:
          deposit?.data_version != null
            ? { dataVersion: String(deposit.data_version) }
            : undefined,
      }),
  })

  const labels: TaskDecisionLabels = {
    commentLabel: t("deposit.ibm_task_form.comment_label"),
    commentPlaceholder: t("deposit.ibm_task_form.comment_placeholder"),
    close: t("common.action.close"),
    confirm: t("deposit.ibm_task_form.action.confirm"),
    approve: t("deposit.ibm_task_form.action.approve"),
    requestChanges: t("deposit.ibm_task_form.action.request_changes"),
    reject: t("deposit.ibm_task_form.action.reject"),
    viewOnly: t("deposit.ibm_task_form.view_only"),
    commentRequired: t("deposit.ibm_task_form.comment_required"),
  }

  const rows: Array<{ label: string; value: string }> = []
  if (deposit) {
    rows.push(
      {
        label: t("deposit.ibm_task_form.field.deposit_code"),
        value: deposit.deposit_code,
      },
      {
        label: t("deposit.ibm_task_form.field.counterparty"),
        value: deposit.counterparty_name || deposit.counterparty_code,
      },
      {
        label: t("deposit.ibm_task_form.field.principal"),
        value: formatAmount(fromMinor(deposit.principal_minor)),
      },
      {
        label: t("deposit.ibm_task_form.field.rate"),
        value: formatRatePercent(deposit.interest_rate),
      },
      {
        label: t("deposit.ibm_task_form.field.status"),
        value: deposit.status,
      }
    )
  }
  if (variant === "movement") {
    rows.push(
      {
        label: t("deposit.ibm_task_form.field.kind"),
        value: movementKind
          ? t(`deposit.ibm_task_form.kind.${movementKind.toLowerCase()}`)
          : "—",
      },
      {
        label: t("deposit.ibm_task_form.field.amount"),
        value:
          movement?.amount_minor != null
            ? formatAmount(fromMinor(movement.amount_minor))
            : "—",
      },
      {
        label: t("deposit.ibm_task_form.field.movement_date"),
        value: movement?.movement_date
          ? formatDateShort(movement.movement_date)
          : "—",
      },
      {
        label: t("deposit.ibm_task_form.field.note"),
        value: movement?.note || "—",
      }
    )
  }

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
          {t("deposit.ibm_task_form.loading")}
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
