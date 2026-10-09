import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
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
  type DisbursementPostingPreview,
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
  const [detail, setDetail] = useState<LoadedDetail | null>(null)
  const [detailError, setDetailError] = useState(false)
  const [detailAttempt, setDetailAttempt] = useState(0)
  const [postingPreview, setPostingPreview] = useState<DisbursementPostingPreview | null>(null)
  const [postingPreviewError, setPostingPreviewError] = useState(false)
  const needsPostingPreview = variant === "disbursement_batch" && task.caseType?.toUpperCase() === "LNM_DISB_BATCH_REGISTER_V2"

  const readOnly = mode === "view"
  const objectId =
    pick(data, VARIANT_ID_KEYS[variant]) ?? task.primaryObjectId ?? ""

  useEffect(() => {
    setDetail(null)
    setDetailError(false)
    setPostingPreview(null)
    setPostingPreviewError(false)
    if (!objectId) {
      setDetailError(true)
      return
    }
    let cancelled = false
    loadDetail(variant, objectId)
      .then((value) => {
        if (!cancelled) setDetail(value)
      })
      .catch(() => {
        if (!cancelled) setDetailError(true)
      })
    if (needsPostingPreview) {
      void disbursementBatchApi.preview(objectId)
        .then((value) => {
          if (!cancelled) setPostingPreview(value)
        })
        .catch(() => {
          if (!cancelled) setPostingPreviewError(true)
        })
    }
    return () => {
      cancelled = true
    }
  }, [variant, objectId, detailAttempt, needsPostingPreview])

  const dataVersion = detail?.value.data_version

  const decision = useTaskDecision({
    task,
    commentRequiredLabel: t("loan.task_form.comment_required"),
    onSubmit: (action, comment) =>
      onSubmit({
        action,
        comment,
        variables:
          dataVersion != null ? { dataVersion: String(dataVersion) } : undefined,
      }),
  })

  const labels: TaskDecisionLabels = {
    commentLabel: t("loan.task_form.comment_label"),
    commentPlaceholder: t("loan.task_form.comment_placeholder"),
    close: t("common.action.close"),
    confirm: t("loan.task_form.action.confirm"),
    approve: t("loan.task_form.action.approve"),
    requestChanges: t("loan.task_form.action.request_changes"),
    reject: t("loan.task_form.action.reject"),
    viewOnly: t("loan.task_form.view_only"),
    commentRequired: t("loan.task_form.comment_required"),
  }

  const statusLabel = (status?: string) =>
    status ? t(`loan.status.${status.toLowerCase()}`) : "—"

  const rows: Array<{ label: string; value: string }> = []
  const batchRows = detail?.variant === "disbursement_batch" ? detail.value.rows ?? [] : []
  const batchHistory = detail?.variant === "disbursement_batch" ? detail.value.history ?? [] : []
  const headroomByContract = new Map(
    (postingPreview?.headroom ?? []).map((item) => [item.contract_code, item.remaining_after_minor])
  )

  if (detail?.variant === "disbursement") {
    const d = detail.value
    rows.push(
      { label: t("loan.task_form.field.contract_code"), value: d.contract_code },
      { label: t("loan.task_form.field.agreement_code"), value: d.agreement_code },
      {
        label: t("loan.task_form.field.flow_type"),
        value: t(`loan.task_form.flow_type.${d.flow_type ?? "REGISTER"}`),
      },
      {
        label: t("loan.task_form.field.amount"),
        value: formatAmount(fromMinor(d.disburse_amt_minor)),
      },
      { label: t("loan.task_form.field.fund_source"), value: d.fund_source_code || "—" },
      {
        label: t("loan.task_form.field.date"),
        value: d.disburse_date ? formatDateShort(d.disburse_date) : "—",
      },
      { label: t("loan.task_form.field.status"), value: statusLabel(d.status) }
    )
  } else if (detail?.variant === "collection") {
    const c = detail.value
    rows.push(
      { label: t("loan.task_form.field.contract_code"), value: c.contract_code },
      { label: t("loan.task_form.field.agreement_code"), value: c.agreement_code },
      {
        label: t("loan.task_form.field.principal"),
        value: formatAmount(fromMinor(c.principal_minor)),
      },
      {
        label: t("loan.task_form.field.interest"),
        value: formatAmount(fromMinor(c.interest_minor)),
      },
      {
        label: t("loan.task_form.field.date"),
        value: c.collection_date ? formatDateShort(c.collection_date) : "—",
      },
      { label: t("loan.task_form.field.status"), value: statusLabel(c.status) }
    )
  } else if (detail?.variant === "general_provision") {
    const g = detail.value
    rows.push(
      { label: t("loan.task_form.field.org"), value: g.org_code },
      {
        label: t("loan.task_form.field.date"),
        value: g.provision_date ? formatDateShort(g.provision_date) : "—",
      },
      {
        label: t("loan.task_form.field.rate"),
        value: formatRatePercent(g.rate_percent),
      },
      {
        label: t("loan.task_form.field.required"),
        value: formatAmount(fromMinor(g.required_provision_minor)),
      },
      {
        label: t("loan.task_form.field.alloc"),
        value: formatAmount(fromMinor(g.alloc_minor)),
      },
      {
        label: t("loan.task_form.field.reverse"),
        value: formatAmount(fromMinor(g.reverse_minor)),
      },
      { label: t("loan.task_form.field.status"), value: statusLabel(g.status) }
    )
  } else if (detail?.variant === "specific_provision") {
    const s = detail.value
    rows.push(
      { label: t("loan.task_form.field.contract_code"), value: s.contract_code },
      { label: t("loan.task_form.field.agreement_code"), value: s.agreement_code },
      {
        label: t("loan.task_form.field.debt_group"),
        value: s.debt_group_code || "—",
      },
      {
        label: t("loan.task_form.field.outstanding"),
        value: formatAmount(fromMinor(s.outstanding_minor)),
      },
      {
        label: t("loan.task_form.field.deduction"),
        value: formatAmount(fromMinor(s.deduction_minor)),
      },
      {
        label: t("loan.task_form.field.amount"),
        value: formatAmount(fromMinor(s.amount_minor)),
      },
      { label: t("loan.task_form.field.status"), value: statusLabel(s.status) }
    )
  } else if (detail?.variant === "disbursement_batch") {
    const b = detail.value
    rows.push(
      {
        label: t("loan.task_form.field.flow_type"),
        value: t(`loan.task_form.flow_type.${b.flow_type ?? "REGISTER"}`),
      },
      {
        label: t("loan.task_form.field.date"),
        value: b.txn_date ? formatDateShort(b.txn_date) : "—",
      },
      {
        label: t("loan.task_form.field.amount"),
        value: formatAmount(fromMinor(b.total_amt_minor ?? 0)),
      },
      {
        label: t("loan.task_form.field.rows"),
        value: String(b.rows?.length ?? 0),
      },
      { label: t("loan.task_form.field.status"), value: statusLabel(b.status) }
    )
  } else if (detail?.variant === "collection_batch") {
    const b = detail.value
    rows.push(
      {
        label: t("loan.task_form.field.date"),
        value: b.txn_date ? formatDateShort(b.txn_date) : "—",
      },
      {
        label: t("loan.task_form.field.total_principal"),
        value: formatAmount(fromMinor(b.total_principal_minor ?? 0)),
      },
      {
        label: t("loan.task_form.field.total_interest"),
        value: formatAmount(fromMinor(b.total_interest_minor ?? 0)),
      },
      {
        label: t("loan.task_form.field.rows"),
        value: String(b.rows?.length ?? 0),
      },
      { label: t("loan.task_form.field.status"), value: statusLabel(b.status) }
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
        detailError ? (
          <div className="space-y-2 rounded-md border border-destructive/40 p-3" role="alert">
            <p className="text-sm text-destructive">{t("loan.task_form.detail_load_failed")}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setDetailAttempt((n) => n + 1)}>
              {t("common.action.retry")}
            </Button>
          </div>
        ) : (
          <div className="space-y-2 py-2" aria-label={t("loan.task_form.loading")}>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )
      )}

      {detail && dataVersion == null ? (
        <p className="text-sm text-destructive" role="alert">
          {t("loan.task_form.data_version_missing")}
        </p>
      ) : null}

      {detail?.variant === "disbursement_batch" ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">{t("loan.task_form.batch_rows")}</h3>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr><th className="p-2">{t("loan.task_form.field.contract_code")}</th><th className="p-2">{t("loan.task_form.field.agreement_code")}</th><th className="p-2 text-right">{t("loan.task_form.field.amount")}</th><th className="p-2 text-right">{t("loan.task_form.headroom_after")}</th><th className="p-2">{t("loan.task_form.field.status")}</th></tr>
              </thead>
              <tbody>
                {batchRows.map((row, index) => (
                  <tr key={`${row.agreement_code}-${index}`} className="border-t">
                    <td className="p-2 font-mono text-xs">{row.contract_code}</td>
                    <td className="p-2 font-mono text-xs">{row.agreement_code}</td>
                    <td className="p-2 text-right tabular-nums">{formatAmount(fromMinor(row.amount_minor))}</td>
                    <td className="p-2 text-right tabular-nums">{headroomByContract.has(row.contract_code) ? formatAmount(fromMinor(headroomByContract.get(row.contract_code)!)) : "—"}</td>
                    <td className="p-2">{statusLabel(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {needsPostingPreview ? (
            <section className="space-y-2 rounded-md border p-3" aria-labelledby="disbursement-posting-preview-title">
              <h3 id="disbursement-posting-preview-title" className="text-sm font-semibold">{t("loan.disbursements.batch.posting_preview")}</h3>
              {postingPreviewError ? (
                <div className="flex items-center gap-2" role="alert">
                  <p className="text-sm text-destructive">{t("loan.disbursements.batch.posting_preview_failed")}</p>
                  <Button type="button" variant="link" size="sm" onClick={() => setDetailAttempt((n) => n + 1)}>{t("common.action.retry")}</Button>
                </div>
              ) : null}
              {!postingPreview && !postingPreviewError ? <Skeleton className="h-16 w-full" /> : null}
              {postingPreview ? (
                <>
                  <p className={postingPreview.valid ? "text-sm text-emerald-700" : "text-sm text-destructive"}>
                    {t(postingPreview.valid ? "loan.disbursements.batch.posting_preview_valid" : "loan.disbursements.batch.posting_preview_invalid", { version: postingPreview.coa_version_id })}
                  </p>
                  {postingPreview.global_errors.map((error, index) => <p key={`${error}-${index}`} className="text-sm text-destructive">{error}</p>)}
                  {postingPreview.lines.map((line) => (
                    <div key={line.line_no} className="grid grid-cols-[auto_1fr_auto] gap-2 border-t pt-2 text-sm">
                      <span className="text-muted-foreground">{line.line_no}</span>
                      <span>{line.description || line.account_name || line.account_code}</span>
                      <span className="text-right tabular-nums">{line.direction} · {formatAmount(fromMinor(line.amount_minor), line.currency_code)}</span>
                      {line.errors.map((error, index) => <p key={`${error}-${index}`} className="col-span-3 text-destructive">{error}</p>)}
                    </div>
                  ))}
                </>
              ) : null}
            </section>
          ) : null}
          <h3 className="text-sm font-semibold">{t("loan.task_form.history")}</h3>
          {batchHistory.length ? <ol className="space-y-2 border-l pl-3">
            {batchHistory.map((event, index) => <li key={`${event.created_at}-${index}`} className="text-sm">
              <p className="font-medium">{event.to_status || event.event_type}</p>
              {event.detail ? <p className="text-muted-foreground">{event.detail}</p> : null}
              <p className="text-xs text-muted-foreground">{event.created_at}</p>
            </li>)}
          </ol> : <p className="text-sm text-muted-foreground">{t("loan.task_form.no_history")}</p>}
        </div>
      ) : null}

      <TaskDecisionBar
        actions={decision.actions}
        labels={labels}
        readOnly={readOnly}
        submitting={submitting}
        disabled={detailError || !detail || dataVersion == null || (needsPostingPreview && (postingPreviewError || !postingPreview?.valid))}
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
