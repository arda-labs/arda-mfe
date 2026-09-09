import { useI18n, translateApiError } from "@workspace/i18n"
import { useNavigate } from "react-router-dom"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  formatDateShort,
  formatMoney,
  formatRatePercent,
  fromMinor,
} from "@workspace/format"
import type { LoanContract } from "../../api"
import { caseDisplayLabel, truncateMiddle } from "../../case-display"

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "ACTIVE":
    case "APPROVED":
      return "default"
    case "PENDING":
    case "DRAFT":
      return "secondary"
    case "REJECTED":
    case "CANCELLED":
      return "destructive"
    default:
      return "outline"
  }
}

function statusLabelKey(status: string): string {
  switch (status) {
    case "DRAFT":
      return "loan.status.draft"
    case "PENDING":
      return "loan.status.pending"
    case "ACTIVE":
      return "loan.status.active"
    case "REJECTED":
      return "loan.status.rejected"
    case "CLOSED":
      return "loan.status.closed"
    default:
      return "loan.status.draft"
  }
}

/** Labeled detail row — read-only label:value pair, EPAS control-block style. */
function DetailField({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="truncate text-sm font-medium">{children ?? "—"}</div>
    </div>
  )
}

/**
 * Contract detail dialog (click a row / "Chi tiết"): full contract header per
 * BE domain.Contract, status badge, the formation case id, and status-driven
 * actions — DRAFT submits, PENDING points at the workbench, ACTIVE opens the
 * disbursement/collection flows, REJECTED explains where to look.
 */
export function ContractDetailDialog({
  contract,
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  contract: LoanContract | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (contract: LoanContract) => Promise<unknown>
  submitting: boolean
}) {
  const { t } = useI18n()
  const navigate = useNavigate()

  if (!contract) return null
  const status = contract.status
  const caseLabel = caseDisplayLabel(
    contract.workflow_case_code,
    contract.workflow_case_id
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-base">{contract.contract_code}</span>
            <Badge variant={statusVariant(status)}>{t(statusLabelKey(status))}</Badge>
          </DialogTitle>
          <DialogDescription>{t("loan.detail.description")}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
          <DetailField label={t("loan.field.contract_no")}>
            {contract.contract_no || undefined}
          </DetailField>
          <DetailField label={t("loan.field.customer")}>{contract.customer_code}</DetailField>
          <DetailField label={t("loan.field.product")}>
            {contract.product_code || undefined}
          </DetailField>
          <DetailField label={t("loan.field.amount")}>
            <span className="tabular-nums">
              {formatMoney(fromMinor(contract.loan_amt_minor))}
            </span>
          </DetailField>
          <DetailField label={t("loan.field.interest_rate")}>
            <span className="tabular-nums">
              {formatRatePercent(contract.interest_rate)}
            </span>
          </DetailField>
          <DetailField label={t("loan.field.term")}>
            {contract.loan_term != null
              ? `${contract.loan_term}${contract.term_unit ? ` ${contract.term_unit}` : ""}`
              : undefined}
          </DetailField>
          <DetailField label={t("loan.field.contract_date")}>
            {formatDateShort(contract.contract_date)}
          </DetailField>
          <DetailField label={t("loan.field.maturity_date")}>
            {formatDateShort(contract.maturity_date)}
          </DetailField>
          <DetailField label={t("loan.field.org_unit")}>
            {contract.employee_code || undefined}
          </DetailField>
          <DetailField label={t("loan.field.created_at")}>
            {formatDateShort(contract.created_at)}
          </DetailField>
          <div className="col-span-2 md:col-span-3">
            <DetailField label={t("loan.field.case_code")}>
              {caseLabel ? (
                <span className="font-mono text-xs" title={caseLabel}>
                  {truncateMiddle(caseLabel)}
                </span>
              ) : undefined}
            </DetailField>
          </div>
          <div className="col-span-2 md:col-span-3">
            <DetailField label={t("loan.field.case")}>
              {contract.workflow_case_id ? (
                <span className="font-mono text-xs" title={contract.workflow_case_id}>
                  {contract.workflow_case_id}
                </span>
              ) : undefined}
            </DetailField>
          </div>
        </div>

        {contract.workflow_case_id ? (
          <p className="text-xs text-muted-foreground">{t("loan.workbench_hint")}</p>
        ) : null}
        {status === "PENDING" ? (
          <p className="text-sm text-muted-foreground">{t("loan.detail.pending_hint")}</p>
        ) : null}
        {status === "REJECTED" ? (
          <p className="text-sm text-destructive">{t("loan.detail.rejected_hint")}</p>
        ) : null}

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("loan.cancel")}
          </Button>
          {status === "ACTIVE" ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  navigate("/loans/disbursements")
                }}
              >
                {t("loan.detail.open_disbursements")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  navigate("/loans/collections")
                }}
              >
                {t("loan.detail.open_collections")}
              </Button>
            </>
          ) : null}
          {status === "DRAFT" ? (
            <Button
              disabled={submitting}
              onClick={() => {
                void onSubmit(contract).catch((error) => {
                  notify.error(translateApiError(error, t("loan.submit_failed")))
                })
              }}
            >
              {t("loan.submit")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
