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
import { capitalApi, type ContractDetail } from "../../api"

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
 * CFM (fund capital) task forms: contract formation, amendment and movement.
 * The dossier comes from the domain read API
 * (`GET /api/capital/contracts/{id}`) — contract context plus the staged
 * amendment/movement — and the contract row version is sent back so the domain
 * can refuse a stale approval.
 */
export function CfcTaskForm({
  task,
  mode,
  data,
  submitting,
  onSubmit,
  onReturn,
  variant = "contract",
}: TaskFormProps & { variant?: "contract" | "amendment" | "movement" }) {
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

  const contractId =
    pick(data, ["contractId", "contract_id"]) ?? task.primaryObjectId ?? ""
  const amendmentId = pick(data, ["amendmentId", "amendment_id"])
  const movementId = pick(data, ["movementId", "movement_id"])

  const [detail, setDetail] = useState<ContractDetail | null>(null)
  useEffect(() => {
    if (!contractId) return
    let cancelled = false
    capitalApi
      .getContract(contractId)
      .then((value) => {
        if (!cancelled) setDetail(value)
      })
      .catch(() => {
        // Preview only — the decision still goes through the domain guard.
      })
    return () => {
      cancelled = true
    }
  }, [contractId])

  const contract = detail?.contract ?? null
  const amendment =
    variant === "amendment" && amendmentId
      ? detail?.amendments?.find((item) => item.id === amendmentId)
      : undefined
  const movement =
    variant === "movement" && movementId
      ? detail?.movements?.find((item) => item.id === movementId)
      : undefined

  function submit(action: WorkflowTaskAction) {
    const trimmed = comment.trim()
    if (requiresComment(task, action) && !trimmed) {
      setError(t("capital.task_form.comment_required"))
      return
    }
    setError("")
    const dataVersion =
      contract?.data_version != null ? String(contract.data_version) : undefined
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
            {t("capital.task_form.action.confirm")}
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
            {t("capital.task_form.action.approve")}
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
            {t("capital.task_form.action.request_changes")}
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
            {t("capital.task_form.action.reject")}
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
  if (contract) {
    rows.push(
      {
        label: t("capital.task_form.field.contract_code"),
        value: contract.contract_code,
      },
      {
        label: t("capital.task_form.field.counterparty"),
        value: contract.counterparty_code,
      },
      {
        label: t("capital.task_form.field.amount"),
        value: formatAmount(fromMinor(contract.amount_minor)),
      },
      {
        label: t("capital.task_form.field.rate"),
        value: formatRatePercent(contract.interest_rate),
      },
      {
        label: t("capital.task_form.field.status"),
        value: t(`capital.status.${contract.status}`),
      }
    )
  }
  if (amendment) {
    rows.push(
      {
        label: t("capital.task_form.field.status"),
        value: t(`capital.amendment_status.${amendment.status}`),
      },
      {
        label: t("capital.task_form.field.reason"),
        value: amendment.reason || "—",
      }
    )
  }
  if (movement) {
    rows.push(
      {
        label: t("capital.task_form.field.kind"),
        value: t(`capital.movement_type.${movement.movement_type}`),
      },
      {
        label: t("capital.task_form.field.movement_amount"),
        value: formatAmount(fromMinor(movement.amount_minor)),
      },
      {
        label: t("capital.task_form.field.movement_date"),
        value: movement.movement_date
          ? formatDateShort(movement.movement_date)
          : "—",
      },
      {
        label: t("capital.task_form.field.note"),
        value: movement.note || "—",
      }
    )
  }

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
          {t("capital.task_form.loading")}
        </p>
      )}

      {!maker && !readOnly ? (
        <div className="space-y-1.5">
          <Label htmlFor="cfc-task-comment">
            {t("capital.task_form.comment_label")}
          </Label>
          <Textarea
            id="cfc-task-comment"
            rows={3}
            value={comment}
            disabled={submitting}
            placeholder={t("capital.task_form.comment_placeholder")}
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
          {t("capital.task_form.view_only")}
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
