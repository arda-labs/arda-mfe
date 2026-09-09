import { useEffect, useMemo, useState } from "react"
import { useI18n, translateApiError } from "@workspace/i18n"
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
import { Input } from "@workspace/ui/components/input"
import { formatAmount, formatDateShort, fromMinor, toMinor } from "@workspace/format"
import { disbursementApi, type LoanDisbursement } from "../../api"
import {
  DisbursementControlInfo,
  DisbursementField,
  DisbursementFieldGroup,
  DisbursementReadonlyField,
} from "./DisbursementInfoFields"

/** BE picker page: POSTED register rows (per_page bounded by MaxPerPage=100). */
const REGISTER_PICKER_PER_PAGE = 100

/**
 * Complete flow ("Hoàn tất giải ngân", LNM.300.02 mirror step): pick a POSTED
 * REGISTER row of the agreement, then draw against it. Amount defaults to the
 * source register amount; the backend validates that it does not exceed the
 * source's remaining un-completed amount. Submits with flow_type "COMPLETE"
 * + source_register_id. Shares the field-group composition with the register
 * dialog (EPAS shared composition).
 */
export function DisbursementCompleteDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [sources, setSources] = useState<LoanDisbursement[]>([])
  const [loadingSources, setLoadingSources] = useState(false)
  const [sourceId, setSourceId] = useState("")
  const [amount, setAmount] = useState("")
  const [savePending, setSavePending] = useState(false)

  const statusLabels = useMemo<Record<string, string>>(
    () => ({
      DRAFT: t("loan.status.draft"),
      SUBMITTED: t("loan.status.submitted"),
      APPROVED: t("loan.status.approved"),
      POSTED: t("loan.status.posted"),
      REJECTED: t("loan.status.rejected"),
      CANCELLED: t("loan.status.cancelled"),
    }),
    [t]
  )

  useEffect(() => {
    if (!open) return
    setLoadingSources(true)
    void disbursementApi
      .list({ flow_type: "REGISTER", status: "POSTED", per_page: REGISTER_PICKER_PER_PAGE })
      .then((result) => setSources(result.items))
      .catch(() => setSources([]))
      .finally(() => setLoadingSources(false))
  }, [open])

  const source = useMemo(
    () => sources.find((item) => item.id === sourceId),
    [sources, sourceId]
  )

  // Default the complete amount to the source register's amount once a
  // source is picked; BE rejects anything above the remaining un-completed.
  useEffect(() => {
    if (!source) return
    setAmount(String(fromMinor(source.disburse_amt_minor, source.currency_code)))
  }, [source])

  const reset = () => {
    setSourceId("")
    setAmount("")
  }

  const submit = async () => {
    if (!source) {
      notify.error(t("loan.disbursements.validation.source_required"))
      return
    }
    const amountMinor = toMinor(Number(amount) || 0, source.currency_code)
    if (amountMinor <= 0) {
      notify.error(t("loan.disbursements.validation.amount_positive"))
      return
    }
    setSavePending(true)
    try {
      await disbursementApi.create({
        contract_code: source.contract_code,
        agreement_code: source.agreement_code,
        disburse_date: source.disburse_date,
        disburse_amt_minor: amountMinor,
        currency_code: source.currency_code,
        fund_source_code: source.fund_source_code || undefined,
        flow_type: "COMPLETE",
        source_register_id: source.id,
      })
      notify.success(t("loan.disbursements.complete.created"), t("loan.draft_created_hint"))
      onOpenChange(false)
      reset()
      await onSaved()
    } catch (error) {
      notify.error(translateApiError(error, "loan.disbursements.complete.failed"))
    } finally {
      setSavePending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("loan.disbursements.complete.title")}</DialogTitle>
          <DialogDescription>
            {t("loan.disbursements.complete.dialog_description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <DisbursementFieldGroup title={t("loan.disbursements.group.disbursement_info")}>
            <DisbursementField label={t("loan.disbursements.complete.field.source_register")}>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={sourceId}
                disabled={loadingSources}
                onChange={(e) => setSourceId(e.target.value)}
              >
                <option value="">
                  {loadingSources
                    ? t("loan.loading")
                    : t("loan.placeholder.select")}
                </option>
                {sources.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.contract_code} / {item.agreement_code} —{" "}
                    {formatDateShort(item.disburse_date)} —{" "}
                    {formatAmount(
                      fromMinor(item.disburse_amt_minor, item.currency_code),
                      item.currency_code
                    )}
                  </option>
                ))}
              </select>
            </DisbursementField>
            {source ? (
              <div className="grid grid-cols-3 gap-3">
                <DisbursementReadonlyField
                  label={t("loan.disbursements.complete.field.source_amount")}
                  value={formatAmount(
                    fromMinor(source.disburse_amt_minor, source.currency_code),
                    source.currency_code
                  )}
                />
                <DisbursementReadonlyField
                  label={t("loan.disbursements.field.currency")}
                  value={source.currency_code}
                />
                <DisbursementReadonlyField
                  label={t("loan.disbursements.field.disburse_date")}
                  value={formatDateShort(source.disburse_date)}
                />
              </div>
            ) : null}
            <DisbursementField label={t("loan.disbursements.complete.field.amount")}>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t("loan.disbursements.complete.placeholder.amount")}
              />
            </DisbursementField>
          </DisbursementFieldGroup>
          <DisbursementControlInfo
            item={source}
            statusLabel={source ? statusLabels[source.status] ?? source.status : undefined}
          />
          <p className="text-xs text-muted-foreground">
            {t("loan.disbursements.complete.remainder_note")}
          </p>
        </div>
        <DialogFooter>
          <Badge variant="info" className="mr-auto">
            {t("loan.disbursements.flow.complete")}
          </Badge>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("loan.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={savePending || !source}>
            {t("loan.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
