import { useEffect, useState } from "react"
import { Check, MessageSquareWarning, X } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import {
  formatAmount,
  formatDateShort,
  formatRatePercent,
  fromMinor,
} from "@workspace/format"
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
import {
  collectionApi,
  collectionBatchApi,
  disbursementApi,
  disbursementBatchApi,
  generalProvisionApi,
  specificProvisionApi,
  type GeneralProvision,
  type LoanCollection,
  type LoanCollectionBatch,
  type LoanDisbursement,
  type LoanDisbursementBatch,
  type SpecificProvision,
} from "../api"

/** One variant per loan case type the workbench form host serves. */
export type LoanTaskFormVariant =
  | "disbursement"
  | "collection"
  | "general_provision"
  | "specific_provision"
  | "disbursement_batch"
  | "collection_batch"

type LoadedDetail =
  | { variant: "disbursement"; value: LoanDisbursement }
  | { variant: "collection"; value: LoanCollection }
  | { variant: "general_provision"; value: GeneralProvision }
  | { variant: "specific_provision"; value: SpecificProvision }
  | { variant: "disbursement_batch"; value: LoanDisbursementBatch }
  | { variant: "collection_batch"; value: LoanCollectionBatch }

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

async function loadDetail(
  variant: LoanTaskFormVariant,
  id: string
): Promise<LoadedDetail> {
  switch (variant) {
    case "disbursement":
      return { variant, value: await disbursementApi.detail(id) }
    case "collection":
      return { variant, value: await collectionApi.detail(id) }
    case "general_provision":
      return { variant, value: await generalProvisionApi.detail(id) }
    case "specific_provision":
      return { variant, value: await specificProvisionApi.detail(id) }
    case "disbursement_batch":
      return { variant, value: await disbursementBatchApi.detail(id) }
    case "collection_batch":
      return { variant, value: await collectionBatchApi.detail(id) }
  }
}

const VARIANT_ID_KEYS: Record<LoanTaskFormVariant, string[]> = {
  disbursement: ["disbursementId", "disbursement_id"],
  collection: ["collectionId", "collection_id"],
  general_provision: ["generalProvisionId", "general_provision_id"],
  specific_provision: ["specificProvisionId", "specific_provision_id"],
  disbursement_batch: ["batchId", "batch_id"],
  collection_batch: ["batchId", "batch_id"],
}

/**
 * Loan task forms: the workbench host resolves one variant per case type and
 * this component loads the dossier from the domain read API (contract/
 * agreement codes, amounts, provision figures or the batch header + row count).
 * The row version the checker saw is sent back as `dataVersion` so the domain
 * can refuse a stale approval.
 */
export function LoanTaskForm({
  task,
  mode,
  data,
  submitting,
  onSubmit,
  onReturn,
  variant = "disbursement",
}: TaskFormProps & { variant?: LoanTaskFormVariant }) {
  const { t } = useI18n()
  const [comment, setComment] = useState("")
  const [error, setError] = useState("")
  const [detail, setDetail] = useState<LoadedDetail | null>(null)

  const maker = isMakerStep(task)
  const readOnly = mode === "view"
  const serverActions = allowedActions(task)
  const actions: WorkflowTaskAction[] = serverActions.length
    ? serverActions
    : maker
      ? [TASK_ACTIONS.submit]
      : [TASK_ACTIONS.approve, TASK_ACTIONS.requestChanges, TASK_ACTIONS.reject]

  const objectId =
    pick(data, VARIANT_ID_KEYS[variant]) ?? task.primaryObjectId ?? ""

  useEffect(() => {
    if (!objectId) return
    let cancelled = false
    loadDetail(variant, objectId)
      .then((value) => {
        if (!cancelled) setDetail(value)
      })
      .catch(() => {
        // Preview only — the decision still goes through the domain guard.
      })
    return () => {
      cancelled = true
    }
  }, [variant, objectId])

  const statusLabel = (status?: string) =>
    status ? t(`loan.status.${status.toLowerCase()}`) : "—"

  const rows: Array<{ label: string; value: string }> = []
  let dataVersion: number | undefined

  if (detail?.variant === "disbursement") {
    const d = detail.value
    dataVersion = d.data_version
    rows.push(
      { label: t("loan.task_form.field.contract_code"), value: d.contract_code },
      { label: t("loan.task_form.field.agreement_code"), value: d.agreement_code },
      { label: t("loan.task_form.field.flow_type"), value: t(`loan.task_form.flow_type.${d.flow_type ?? "REGISTER"}`) },
      { label: t("loan.task_form.field.amount"), value: formatAmount(fromMinor(d.disburse_amt_minor)) },
      { label: t("loan.task_form.field.fund_source"), value: d.fund_source_code || "—" },
      { label: t("loan.task_form.field.date"), value: d.disburse_date ? formatDateShort(d.disburse_date) : "—" },
      { label: t("loan.task_form.field.status"), value: statusLabel(d.status) }
    )
  } else if (detail?.variant === "collection") {
    const c = detail.value
    dataVersion = c.data_version
    rows.push(
      { label: t("loan.task_form.field.contract_code"), value: c.contract_code },
      { label: t("loan.task_form.field.agreement_code"), value: c.agreement_code },
      { label: t("loan.task_form.field.principal"), value: formatAmount(fromMinor(c.principal_minor)) },
      { label: t("loan.task_form.field.interest"), value: formatAmount(fromMinor(c.interest_minor)) },
      { label: t("loan.task_form.field.date"), value: c.collection_date ? formatDateShort(c.collection_date) : "—" },
      { label: t("loan.task_form.field.status"), value: statusLabel(c.status) }
    )
  } else if (detail?.variant === "general_provision") {
    const g = detail.value
    dataVersion = g.data_version
    rows.push(
      { label: t("loan.task_form.field.org"), value: g.org_code },
      { label: t("loan.task_form.field.date"), value: g.provision_date ? formatDateShort(g.provision_date) : "—" },
      { label: t("loan.task_form.field.rate"), value: formatRatePercent(g.rate_percent) },
      { label: t("loan.task_form.field.required"), value: formatAmount(fromMinor(g.required_provision_minor)) },
      { label: t("loan.task_form.field.alloc"), value: formatAmount(fromMinor(g.alloc_minor)) },
      { label: t("loan.task_form.field.reverse"), value: formatAmount(fromMinor(g.reverse_minor)) },
      { label: t("loan.task_form.field.status"), value: statusLabel(g.status) }
    )
  } else if (detail?.variant === "specific_provision") {
    const s = detail.value
    dataVersion = s.data_version
    rows.push(
      { label: t("loan.task_form.field.contract_code"), value: s.contract_code },
      { label: t("loan.task_form.field.agreement_code"), value: s.agreement_code },
      { label: t("loan.task_form.field.debt_group"), value: s.debt_group_code || "—" },
      { label: t("loan.task_form.field.outstanding"), value: formatAmount(fromMinor(s.outstanding_minor)) },
      { label: t("loan.task_form.field.deduction"), value: formatAmount(fromMinor(s.deduction_minor)) },
      { label: t("loan.task_form.field.amount"), value: formatAmount(fromMinor(s.amount_minor)) },
      { label: t("loan.task_form.field.status"), value: statusLabel(s.status) }
    )
  } else if (detail?.variant === "disbursement_batch") {
    const b = detail.value
    dataVersion = b.data_version
    rows.push(
      { label: t("loan.task_form.field.flow_type"), value: t(`loan.task_form.flow_type.${b.flow_type ?? "REGISTER"}`) },
      { label: t("loan.task_form.field.date"), value: b.txn_date ? formatDateShort(b.txn_date) : "—" },
      { label: t("loan.task_form.field.amount"), value: formatAmount(fromMinor(b.total_amt_minor ?? 0)) },
      { label: t("loan.task_form.field.rows"), value: String(b.rows?.length ?? 0) },
      { label: t("loan.task_form.field.status"), value: statusLabel(b.status) }
    )
  } else if (detail?.variant === "collection_batch") {
    const b = detail.value
    dataVersion = b.data_version
    rows.push(
      { label: t("loan.task_form.field.date"), value: b.txn_date ? formatDateShort(b.txn_date) : "—" },
      { label: t("loan.task_form.field.total_principal"), value: formatAmount(fromMinor(b.total_principal_minor ?? 0)) },
      { label: t("loan.task_form.field.total_interest"), value: formatAmount(fromMinor(b.total_interest_minor ?? 0)) },
      { label: t("loan.task_form.field.rows"), value: String(b.rows?.length ?? 0) },
      { label: t("loan.task_form.field.status"), value: statusLabel(b.status) }
    )
  }

  function submit(action: WorkflowTaskAction) {
    const trimmed = comment.trim()
    if (requiresComment(task, action) && !trimmed) {
      setError(t("loan.task_form.comment_required"))
      return
    }
    setError("")
    void onSubmit({
      action,
      comment: trimmed,
      variables:
        dataVersion != null ? { dataVersion: String(dataVersion) } : undefined,
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
                ? "loan.task_form.action.confirm"
                : "loan.task_form.action.approve"
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
            {t("loan.task_form.action.request_changes")}
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
            {t("loan.task_form.action.reject")}
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
          {t("loan.task_form.loading")}
        </p>
      )}

      {!maker && !readOnly ? (
        <div className="space-y-1.5">
          <Label htmlFor="loan-task-comment">
            {t("loan.task_form.comment_label")}
          </Label>
          <Textarea
            id="loan-task-comment"
            rows={3}
            value={comment}
            disabled={submitting}
            placeholder={t("loan.task_form.comment_placeholder")}
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
          {t("loan.task_form.view_only")}
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
