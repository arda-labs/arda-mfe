import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { formatAmount, formatDateShort, fromMinor } from "@workspace/format"
import {
  TaskDecisionBar,
  useTaskDecision,
  type TaskDecisionLabels,
  type TaskFormProps,
} from "@workspace/workflow-task"
import { journalEntryApi, type JournalEntryDetail } from "../../api"

/**
 * FIN_FUND_APPROP_V2 / FIN_FUND_USE_V2 task form: the fund posting staged for
 * the case (Nợ 4211 / Có quỹ for trích lập; Nợ quỹ / Có 1131 for sử dụng).
 * The dossier comes from `GET /api/finance/journal-entries/by-case/{caseId}` —
 * the narrow read that includes the PENDING entry — and the row version is sent
 * back as `dataVersion`.
 */
export function FundTaskForm({
  task,
  mode,
  submitting,
  onSubmit,
  onReturn,
}: TaskFormProps) {
  const { t } = useI18n()
  const [detail, setDetail] = useState<JournalEntryDetail | null>(null)

  const readOnly = mode === "view"

  useEffect(() => {
    if (!task.caseId) return
    let cancelled = false
    journalEntryApi
      .casePosting(task.caseId)
      .then((value) => {
        if (!cancelled) setDetail(value)
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
    commentRequiredLabel: t("finance.fund_task_form.comment_required"),
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
    commentLabel: t("finance.fund_task_form.comment_label"),
    commentPlaceholder: t("finance.fund_task_form.comment_placeholder"),
    close: t("common.action.close"),
    confirm: t("finance.fund_task_form.action.confirm"),
    approve: t("finance.fund_task_form.action.approve"),
    requestChanges: t("finance.fund_task_form.action.request_changes"),
    reject: t("finance.fund_task_form.action.reject"),
    viewOnly: t("finance.fund_task_form.view_only"),
    commentRequired: t("finance.fund_task_form.comment_required"),
  }

  const rows: Array<{ label: string; value: string }> = []
  if (detail) {
    rows.push(
      {
        label: t("finance.fund_task_form.field.entry_no"),
        value: String(detail.entry_no),
      },
      {
        label: t("finance.fund_task_form.field.description"),
        value: detail.description || "—",
      },
      {
        label: t("finance.fund_task_form.field.accounting_date"),
        value: detail.accounting_date
          ? formatDateShort(detail.accounting_date)
          : "—",
      },
      {
        label: t("finance.fund_task_form.field.total"),
        value: formatAmount(fromMinor(detail.total_amount_minor)),
      },
      {
        label: t("finance.fund_task_form.field.status"),
        value: t(
          `finance.fund_task_form.status.${detail.status.toLowerCase()}`
        ),
      }
    )
  }

  return (
    <div className="space-y-4">
      {detail ? (
        <div className="space-y-2">
          <dl className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3 text-sm">
            {rows.map((row, index) => (
              <div key={`${row.label}-${index}`} className="space-y-0.5">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">
                    {t("finance.fund_task_form.col.account")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t("finance.fund_task_form.col.direction")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    {t("finance.fund_task_form.col.amount")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {detail.lines.map((line) => (
                  <tr key={line.line_no} className="border-t">
                    <td className="px-3 py-2">
                      {line.account_code}
                      {line.account_name ? ` — ${line.account_name}` : ""}
                    </td>
                    <td className="px-3 py-2">
                      {t(`finance.fund_task_form.direction.${line.direction}`)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatAmount(fromMinor(line.amount_minor))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {t("finance.fund_task_form.loading")}
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
