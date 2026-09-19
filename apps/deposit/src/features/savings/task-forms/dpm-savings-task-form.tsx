import { useEffect, useState } from "react"
import { Check, MessageSquareWarning, X } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { formatAmount, formatDateShort, fromMinor } from "@workspace/format"
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
import { depositApi, type SavingsDetail } from "../../api"

/**
 * Savings-centric deposit task forms (DPM.301 additional, DPM.306 settle,
 * DPM.302/303 pay-interest/capitalize). The variant only changes the amount
 * label and whether the operation kind is shown; the dossier always comes from
 * the domain read API (`GET /api/deposit/savings/{code}`), not from case
 * variables, and the row version is sent back so the domain can refuse a
 * stale approval.
 */
export type DpmSavingsTaskVariant = "additional" | "settle" | "interest"

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

function minor(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

export function DpmSavingsTaskForm({
  task,
  mode,
  data,
  submitting,
  onSubmit,
  onReturn,
  variant = "additional",
}: TaskFormProps & { variant?: DpmSavingsTaskVariant }) {
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

  const savingsCode =
    pick(data, ["savingsCode", "savings_code"]) ??
    task.primaryObjectId ??
    task.caseCode
  const txnDate = pick(data, ["txnDate", "txn_date"])
  const opId = pick(data, ["opId", "op_id"])

  // Domain read API: the checker sees the current principal/status/accrual and
  // the row version they are approving.
  const [detail, setDetail] = useState<SavingsDetail | null>(null)
  useEffect(() => {
    if (!savingsCode) return
    let cancelled = false
    depositApi
      .getSavings(savingsCode)
      .then((value) => {
        if (!cancelled) setDetail(value)
      })
      .catch(() => {
        // Preview only — the decision still goes through the domain guard.
      })
    return () => {
      cancelled = true
    }
  }, [savingsCode])

  const savings = detail?.savings ?? null
  const interestOp =
    variant === "interest" && opId
      ? detail?.interest_ops?.find((op) => op.id === opId)
      : undefined
  const opType = (
    pick(data, ["opType", "op_type"]) ?? interestOp?.op_type
  )?.toUpperCase()
  const amountMinor =
    minor(data?.amountMinor) ??
    minor(data?.amount_minor) ??
    // Settle pays out principal + accrued; the case carries only the code.
    (variant === "settle" && savings
      ? savings.principal_minor + savings.accrued_minor
      : undefined) ??
    // Interest amount lives on the staged op, not in the case variables.
    interestOp?.amount_minor

  function submit(action: WorkflowTaskAction) {
    const trimmed = comment.trim()
    if (requiresComment(task, action) && !trimmed) {
      setError(t("deposit.savings.task_form.comment_required"))
      return
    }
    setError("")
    const dataVersion =
      savings?.data_version != null ? String(savings.data_version) : undefined
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
            {t("deposit.savings.task_form.action.confirm")}
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
            {t("deposit.savings.task_form.action.approve")}
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
            {t("deposit.savings.task_form.action.request_changes")}
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
            {t("deposit.savings.task_form.action.reject")}
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
      <dl className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3 text-sm">
        <div className="space-y-0.5">
          <dt className="text-muted-foreground">
            {t("deposit.savings.task_form.field.savings_code")}
          </dt>
          <dd className="font-medium">{savingsCode || "—"}</dd>
        </div>
        <div className="space-y-0.5">
          <dt className="text-muted-foreground">
            {t(`deposit.savings.task_form.amount.${variant}`)}
          </dt>
          <dd className="font-medium">
            {amountMinor != null ? formatAmount(fromMinor(amountMinor)) : "—"}
          </dd>
        </div>
        {variant === "interest" && opType ? (
          <div className="space-y-0.5">
            <dt className="text-muted-foreground">
              {t("deposit.savings.task_form.field.op_type")}
            </dt>
            <dd className="font-medium">
              {t(`deposit.savings.task_form.op.${opType.toLowerCase()}`)}
            </dd>
          </div>
        ) : null}
        <div className="space-y-0.5">
          <dt className="text-muted-foreground">
            {t("deposit.savings.task_form.field.txn_date")}
          </dt>
          <dd className="font-medium">
            {txnDate ? formatDateShort(txnDate) : "—"}
          </dd>
        </div>
        <div className="space-y-0.5">
          <dt className="text-muted-foreground">
            {t("deposit.savings.task_form.field.step")}
          </dt>
          <dd className="font-medium">{task.stepCode}</dd>
        </div>
        {savings ? (
          <>
            <div className="space-y-0.5">
              <dt className="text-muted-foreground">
                {t("deposit.savings.task_form.field.principal")}
              </dt>
              <dd className="font-medium">
                {formatAmount(fromMinor(savings.principal_minor))}
              </dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-muted-foreground">
                {t("deposit.savings.task_form.field.accrued")}
              </dt>
              <dd className="font-medium">
                {formatAmount(fromMinor(savings.accrued_minor))}
              </dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-muted-foreground">
                {t("deposit.savings.task_form.field.status")}
              </dt>
              <dd className="font-medium">
                {t(`deposit.savings.status.${savings.status}`)}
              </dd>
            </div>
          </>
        ) : null}
      </dl>

      {!maker && !readOnly ? (
        <div className="space-y-1.5">
          <Label htmlFor="dpm-savings-comment">
            {t("deposit.savings.task_form.comment_label")}
          </Label>
          <Textarea
            id="dpm-savings-comment"
            rows={3}
            value={comment}
            disabled={submitting}
            placeholder={t("deposit.savings.task_form.comment_placeholder")}
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
          {t("deposit.savings.task_form.view_only")}
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
