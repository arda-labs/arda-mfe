import { useEffect, useState } from "react"
import { Check, MessageSquareWarning, X } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { formatAmount, formatDateShort, formatRatePercent, fromMinor } from "@workspace/format"
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

  const depositId =
    pick(data, ["depositId", "deposit_id"]) ?? task.primaryObjectId ?? ""
  const movementId = pick(data, ["movementId", "movement_id"])
  const kind = pick(data, ["kind"])?.toUpperCase()

  const [detail, setDetail] = useState<IbmDetail | null>(null)
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

  function submit(action: WorkflowTaskAction) {
    const trimmed = comment.trim()
    if (requiresComment(task, action) && !trimmed) {
      setError(t("deposit.ibm_task_form.comment_required"))
      return
    }
    setError("")
    const dataVersion =
      deposit?.data_version != null ? String(deposit.data_version) : undefined
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
            {t("deposit.ibm_task_form.action.confirm")}
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
            {t("deposit.ibm_task_form.action.approve")}
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
            {t("deposit.ibm_task_form.action.request_changes")}
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
            {t("deposit.ibm_task_form.action.reject")}
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

      {!maker && !readOnly ? (
        <div className="space-y-1.5">
          <Label htmlFor="ibm-task-comment">
            {t("deposit.ibm_task_form.comment_label")}
          </Label>
          <Textarea
            id="ibm-task-comment"
            rows={3}
            value={comment}
            disabled={submitting}
            placeholder={t("deposit.ibm_task_form.comment_placeholder")}
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
          {t("deposit.ibm_task_form.view_only")}
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
