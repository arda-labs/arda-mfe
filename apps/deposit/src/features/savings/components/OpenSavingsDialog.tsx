import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { useStagedAttachments } from "@workspace/case-tabs"
import { attachEntityFiles } from "@workspace/media"
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
import { DateField } from "@workspace/ui/components/date-field"
import { SelectField } from "@workspace/ui/components/select-field"
import { toMinor, todayISO } from "@workspace/format"
import { depositApi, type SavingsProduct } from "../../api"
import { MoneyInput } from "@workspace/ui/components/money-input"

type Form = {
  savings_code: string
  customer_code: string
  product_code: string
  open_date: string
  amount: string
  currency_code: string
}

const emptyForm: Form = {
  savings_code: "",
  customer_code: "",
  product_code: "",
  open_date: "",
  amount: "",
  currency_code: "VND",
}

/** Open-savings dialog: pick product, type customer + principal (minor via toMinor). */
export function OpenSavingsDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const staged = useStagedAttachments({ module: "deposit" })
  const [form, setForm] = useState<Form>(() => ({
    ...emptyForm,
    open_date: todayISO(),
  }))
  const [products, setProducts] = useState<SavingsProduct[]>([])
  const [savePending, setSavePending] = useState(false)

  useEffect(() => {
    if (!open) return
    void depositApi
      .listProducts({ is_active: "true" })
      .then((result) => setProducts(result.items))
      .catch(() => setProducts([]))
  }, [open])

  const submit = async () => {
    const amountMinor = toMinor(Number(form.amount) || 0, form.currency_code)
    if (!form.savings_code || !form.customer_code || !form.product_code || amountMinor <= 0) {
      notify.error(t("deposit.savings.validation.required"))
      return
    }
    setSavePending(true)
    try {
      const opened = await depositApi.openSavings({
        savings_code: form.savings_code,
        customer_code: form.customer_code,
        product_code: form.product_code,
        open_date: form.open_date,
        principal_minor: amountMinor,
        currency_code: form.currency_code,
      })
      try {
        // Direct posting — no workflow case: staged files attach to the
        // savings entity instead (dpm_savings), same owner used by the
        // detail screen's attachment tab.
        if (staged.ids.length > 0 && opened.id) {
          await attachEntityFiles(staged.ids, "dpm_savings", opened.id)
        }
      } catch {
        notify.error(t("common.case_tabs.attachments.attach_error"))
      }
      notify.success(t("deposit.savings.open_success"))
      onOpenChange(false)
      setForm({ ...emptyForm, open_date: todayISO() })
      await onSaved()
    } catch {
      notify.error(t("deposit.savings.open_failed"))
    } finally {
      setSavePending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deposit.savings.open_title")}</DialogTitle>
          <DialogDescription>
            {t("deposit.savings.open_description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("deposit.savings.field.savings_code")}</Label>
              <Input
                value={form.savings_code}
                onChange={(e) => setForm((c) => ({ ...c, savings_code: e.target.value }))}
                placeholder="SV-2026-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("deposit.savings.field.customer")}</Label>
              <Input
                value={form.customer_code}
                onChange={(e) => setForm((c) => ({ ...c, customer_code: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.savings.field.product")}</Label>
            <SelectField
              value={form.product_code}
              onChange={(e) => setForm((c) => ({ ...c, product_code: e.target.value }))}
              placeholder={t("deposit.placeholder.select")}
              options={products.map((p) => ({
                value: p.code,
                code: p.code,
                label: p.name,
                hint: `${p.term_months} ${t("deposit.products.months_short")}, ${p.interest_rate}%`,
              }))}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>{t("deposit.savings.field.amount")}</Label>
              <MoneyInput
                value={form.amount}
                onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))}
                currency={form.currency_code}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.field.currency")}</Label>
              <Input
                value={form.currency_code}
                maxLength={3}
                onChange={(e) => setForm((c) => ({ ...c, currency_code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("deposit.savings.field.open_date")}</Label>
              <DateField
                value={form.open_date}
                onChange={(e) => setForm((c) => ({ ...c, open_date: e.target.value }))}
              />
            </div>
          </div>
        </div>
        {staged.tab.content}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.action.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={savePending}>
            {t("deposit.savings.open")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
