import { useEffect, useState } from "react"
import { Check, MessageSquareWarning, X } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { formatAmount, fromMinor } from "@workspace/format"
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
import { depositApi, type InterestOp } from "../../api"

const MAX_ROWS = 20

/**
 * DPM.304 batch interest — the checker sees every staged op of the case from
 * the domain read API (`GET /api/deposit/interest-ops?case_id=`) with the
 * totals, then approves / requests changes / rejects. The batch spans many
 * savings accounts, so the settle guard runs per op inside the worker.
 */
export function DpmBatchInterestTaskForm({
  task,
  mode,
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

  const [ops, setOps] = useState<InterestOp[] | null>(null)
  useEffect(() => {
    if (!task.caseId) return
    let cancelled = false
    depositApi
      .getInterestOpsByCase(task.caseId)
      .then((items) => {
        if (!cancelled) setOps(items)
      })
      .catch(() => {
        // Preview only — the decision still goes through the worker guard.
      })
    return () => {
      cancelled = true
    }
  }, [task.caseId])

  function submit(action: WorkflowTaskAction) {
    const trimmed = comment.trim()
    if (requiresComment(task, action) && !trimmed) {
      setError(t("deposit.batch_task_form.comment_required"))
      return
    }
    setError("")
    void onSubmit({ action, comment: trimmed })
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
            {t("deposit.batch_task_form.action.confirm")}
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
            {t("deposit.batch_task_form.action.approve")}
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
            {t("deposit.batch_task_form.action.request_changes")}
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
            {t("deposit.batch_task_form.action.reject")}
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

  const totalMinor = ops?.reduce((sum, op) => sum + op.amount_minor, 0) ?? 0

  return (
    <div className="space-y-4">
      {ops ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3 text-sm">
            <div className="space-y-0.5">
              <dt className="text-muted-foreground">
                {t("deposit.batch_task_form.field.count")}
              </dt>
              <dd className="font-medium">{ops.length}</dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-muted-foreground">
                {t("deposit.batch_task_form.field.total")}
              </dt>
              <dd className="font-medium">
                {formatAmount(fromMinor(totalMinor))}
              </dd>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">
                    {t("deposit.batch_task_form.col.savings_code")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t("deposit.batch_task_form.col.op_type")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    {t("deposit.batch_task_form.col.amount")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ops.slice(0, MAX_ROWS).map((op) => (
                  <tr key={op.id} className="border-t">
                    <td className="px-3 py-2">{op.savings_code}</td>
                    <td className="px-3 py-2">
                      {t(
                        `deposit.batch_task_form.op.${op.op_type.toLowerCase()}`
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatAmount(fromMinor(op.amount_minor))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {t("deposit.batch_task_form.loading")}
        </p>
      )}

      {!maker && !readOnly ? (
        <div className="space-y-1.5">
          <Label htmlFor="dpm-batch-comment">
            {t("deposit.batch_task_form.comment_label")}
          </Label>
          <Textarea
            id="dpm-batch-comment"
            rows={3}
            value={comment}
            disabled={submitting}
            placeholder={t("deposit.batch_task_form.comment_placeholder")}
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
          {t("deposit.batch_task_form.view_only")}
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
