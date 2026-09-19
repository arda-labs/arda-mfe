import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { formatAmount, fromMinor } from "@workspace/format"
import {
  TaskDecisionBar,
  useTaskDecision,
  type TaskDecisionLabels,
  type TaskFormProps,
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

  const readOnly = mode === "view"

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

  const decision = useTaskDecision({
    task,
    commentRequiredLabel: t("deposit.batch_task_form.comment_required"),
    onSubmit: (action, comment) => onSubmit({ action, comment }),
  })

  const labels: TaskDecisionLabels = {
    commentLabel: t("deposit.batch_task_form.comment_label"),
    commentPlaceholder: t("deposit.batch_task_form.comment_placeholder"),
    close: t("common.action.close"),
    confirm: t("deposit.batch_task_form.action.confirm"),
    approve: t("deposit.batch_task_form.action.approve"),
    requestChanges: t("deposit.batch_task_form.action.request_changes"),
    reject: t("deposit.batch_task_form.action.reject"),
    viewOnly: t("deposit.batch_task_form.view_only"),
    commentRequired: t("deposit.batch_task_form.comment_required"),
  }

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
