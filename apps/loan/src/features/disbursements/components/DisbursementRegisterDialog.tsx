import { useEffect, useState } from "react"
import { useI18n, translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
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
import { todayISO, toMinor } from "@workspace/format"
import { loanApi, disbursementApi, type LoanContract } from "../../api"
import {
  DisbursementField,
  DisbursementFieldGroup,
} from "./DisbursementInfoFields"

type Form = {
  contract_code: string
  agreement_code: string
  disburse_date: string
  amount: string
  currency_code: string
  fund_source_code: string
}

const emptyForm: Form = {
  contract_code: "",
  agreement_code: "",
  disburse_date: "",
  amount: "",
  currency_code: "VND",
  fund_source_code: "",
}

/**
 * Register flow (LNM.300.02 step 1): pick an ACTIVE
 * contract, its agreement, amount + date + fund source. Submits a DRAFT row
 * with flow_type "REGISTER" — the workbench approval posts the journal entry.
 * Shares the EPAS-style field-group composition with the complete dialog.
 */
export function DisbursementRegisterDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [form, setForm] = useState<Form>(() => ({
    ...emptyForm,
    disburse_date: todayISO(),
  }))
  const [contracts, setContracts] = useState<LoanContract[]>([])
  const [savePending, setSavePending] = useState(false)

  useEffect(() => {
    if (!open) return
    void loanApi
      .listContracts({ status: "ACTIVE" })
      .then((result) => setContracts(result.items))
      .catch(() => setContracts([]))
  }, [open])

  const submit = async () => {
    if (!form.contract_code || !form.amount) {
      notify.error(t("loan.disbursements.validation.contract_required"))
      return
    }
    const amountMinor = toMinor(Number(form.amount) || 0, form.currency_code)
    if (amountMinor <= 0) {
      notify.error(t("loan.disbursements.validation.amount_positive"))
      return
    }
    setSavePending(true)
    try {
      await disbursementApi.create({
        contract_code: form.contract_code,
        agreement_code: form.agreement_code,
        disburse_date: form.disburse_date,
        disburse_amt_minor: amountMinor,
        currency_code: form.currency_code,
        fund_source_code: form.fund_source_code || undefined,
        flow_type: "REGISTER",
      })
      notify.success(t("loan.disbursements.created_draft"), t("loan.draft_created_hint"))
      onOpenChange(false)
      setForm({ ...emptyForm, disburse_date: todayISO() })
      await onSaved()
    } catch (error) {
      notify.error(translateApiError(error, "loan.disbursements.create_failed"))
    } finally {
      setSavePending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("loan.disbursements.register.title")}</DialogTitle>
          <DialogDescription>
            {t("loan.disbursements.register.dialog_description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <DisbursementFieldGroup title={t("loan.disbursements.group.disbursement_info")}>
            <DisbursementField label={t("loan.disbursements.field.contract")}>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.contract_code}
                onChange={(e) => setForm((c) => ({ ...c, contract_code: e.target.value }))}
              >
                <option value="">{t("loan.placeholder.select")}</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.contract_code}>
                    {c.contract_code} — {c.customer_code}
                  </option>
                ))}
              </select>
            </DisbursementField>
            <DisbursementField label={t("loan.field.agreement_code")}>
              <Input
                value={form.agreement_code}
                onChange={(e) => setForm((c) => ({ ...c, agreement_code: e.target.value }))}
                placeholder={t("loan.placeholder.agreement")}
              />
            </DisbursementField>
            <div className="grid grid-cols-3 gap-3">
              <DisbursementField label={t("loan.disbursements.field.amount_short")}>
                <Input
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))}
                />
              </DisbursementField>
              <DisbursementField label={t("loan.disbursements.field.currency")}>
                <Input
                  value={form.currency_code}
                  maxLength={3}
                  onChange={(e) => setForm((c) => ({ ...c, currency_code: e.target.value.toUpperCase() }))}
                />
              </DisbursementField>
              <DisbursementField label={t("loan.disbursements.field.disburse_date")}>
                <Input
                  type="date"
                  value={form.disburse_date}
                  onChange={(e) => setForm((c) => ({ ...c, disburse_date: e.target.value }))}
                />
              </DisbursementField>
            </div>
            <DisbursementField label={t("loan.disbursements.field.fund_source")}>
              <Input
                value={form.fund_source_code}
                onChange={(e) => setForm((c) => ({ ...c, fund_source_code: e.target.value }))}
                placeholder={t("loan.disbursements.placeholder.fund_source")}
              />
            </DisbursementField>
          </DisbursementFieldGroup>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("loan.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={savePending}>
            {t("loan.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
