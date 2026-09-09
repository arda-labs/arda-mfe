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
import { parseMoneyInput, todayISO, toMinor } from "@workspace/format"
import { loanApi, collectionApi, type LoanContract } from "../../api"

type Form = {
  contract_code: string
  agreement_code: string
  collection_date: string
  principal: string
  interest: string
  currency_code: string
}

const emptyForm: Form = {
  contract_code: "",
  agreement_code: "",
  collection_date: "",
  principal: "",
  interest: "",
  currency_code: "VND",
}

/** Create-dialog: pick an ACTIVE contract, type agreement code, split
 * principal + interest amounts (minor units via toMinor). */
export function CollectionCreateDialog({
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
    collection_date: todayISO(),
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
    const principalMinor = toMinor(parseMoneyInput(form.principal) ?? 0, form.currency_code)
    const interestMinor = toMinor(parseMoneyInput(form.interest) ?? 0, form.currency_code)
    if (!form.contract_code || !form.agreement_code) {
      notify.error(t("loan.collections.validation.contract_required"))
      return
    }
    if (principalMinor <= 0 && interestMinor <= 0) {
      notify.error(t("loan.collections.validation.amounts_positive"))
      return
    }
    setSavePending(true)
    try {
      await collectionApi.create({
        contract_code: form.contract_code,
        agreement_code: form.agreement_code,
        collection_date: form.collection_date,
        principal_minor: principalMinor,
        interest_minor: interestMinor,
        currency_code: form.currency_code,
      })
      notify.success(t("loan.collections.created_draft"), t("loan.draft_created_hint"))
      onOpenChange(false)
      setForm({ ...emptyForm, collection_date: todayISO() })
      await onSaved()
    } catch (error) {
      notify.error(translateApiError(error, "loan.collections.create_failed"))
    } finally {
      setSavePending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("loan.collections.create")}</DialogTitle>
          <DialogDescription>
            {t("loan.collections.dialog_description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t("loan.collections.field.contract")}</Label>
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
              <Label>{t("loan.collections.field.principal")}</Label>
              <Input
                inputMode="decimal"
                value={form.principal}
                onChange={(e) => setForm((c) => ({ ...c, principal: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("loan.collections.field.interest")}</Label>
              <Input
                inputMode="decimal"
                value={form.interest}
                onChange={(e) => setForm((c) => ({ ...c, interest: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("loan.collections.field.collection_date")}</Label>
              <Input
                type="date"
                value={form.collection_date}
                onChange={(e) => setForm((c) => ({ ...c, collection_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("loan.disbursements.field.currency")}</Label>
              <Input
                value={form.currency_code}
                maxLength={3}
                onChange={(e) => setForm((c) => ({ ...c, currency_code: e.target.value.toUpperCase() }))}
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
