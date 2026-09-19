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
  const [detail, setDetail] = useState<ContractDetail | null>(null)

  const readOnly = mode === "view"
  const contractId =
    pick(data, ["contractId", "contract_id"]) ?? task.primaryObjectId ?? ""
  const amendmentId = pick(data, ["amendmentId", "amendment_id"])
  const movementId = pick(data, ["movementId", "movement_id"])

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

  const decision = useTaskDecision({
    task,
    commentRequiredLabel: t("capital.task_form.comment_required"),
    onSubmit: (action, comment) =>
      onSubmit({
        action,
        comment,
        variables:
          contract?.data_version != null
            ? { dataVersion: String(contract.data_version) }
            : undefined,
      }),
  })

  const labels: TaskDecisionLabels = {
    commentLabel: t("capital.task_form.comment_label"),
    commentPlaceholder: t("capital.task_form.comment_placeholder"),
    close: t("common.action.close"),
    confirm: t("capital.task_form.action.confirm"),
    approve: t("capital.task_form.action.approve"),
    requestChanges: t("capital.task_form.action.request_changes"),
    reject: t("capital.task_form.action.reject"),
    viewOnly: t("capital.task_form.view_only"),
    commentRequired: t("capital.task_form.comment_required"),
  }

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
