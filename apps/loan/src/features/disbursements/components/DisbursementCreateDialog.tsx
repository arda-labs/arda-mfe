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
import { Label } from "@workspace/ui/components/label"
import { todayISO, toMinor } from "@workspace/format"
import { loanApi, disbursementApi, type LoanContract } from "../../api"

type Form = {
  contract_code: string
  agreement_code: string
  disburse_date: string
  amount: string
  currency_code: string
}

const emptyForm: Form = {
  contract_code: "",
  agreement_code: "",
  disburse_date: "",
  amount: "",
  currency_code: "VND",
}

/** Create-dialog: pick an ACTIVE contract, its agreement, amount + date. */
export function DisbursementCreateDialog({
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
      })
      notify.success(t("loan.disbursements.created_draft"))
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
          <DialogTitle>{t("loan.disbursements.create")}</DialogTitle>
          <DialogDescription>
            {t("loan.disbursements.dialog_description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t("loan.disbursements.field.contract")}</Label>
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
          </div>
          <div className="space-y-1.5">
            <Label>{t("loan.field.agreement_code")}</Label>
            <Input
              value={form.agreement_code}
              onChange={(e) => setForm((c) => ({ ...c, agreement_code: e.target.value }))}
              placeholder={t("loan.placeholder.agreement")}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>{t("loan.disbursements.field.amount_short")}</Label>
              <Input
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("loan.disbursements.field.currency")}</Label>
              <Input
                value={form.currency_code}
                maxLength={3}
                onChange={(e) => setForm((c) => ({ ...c, currency_code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("loan.disbursements.field.disburse_date")}</Label>
              <Input
                type="date"
                value={form.disburse_date}
                onChange={(e) => setForm((c) => ({ ...c, disburse_date: e.target.value }))}
              />
            </div>
          </div>
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
