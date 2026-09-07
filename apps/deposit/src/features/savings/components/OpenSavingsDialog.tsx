import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
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
import { toMinor, todayISO } from "@workspace/format"
import { depositApi, type SavingsProduct } from "../../api"

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
      await depositApi.openSavings({
        savings_code: form.savings_code,
        customer_code: form.customer_code,
        product_code: form.product_code,
        open_date: form.open_date,
        principal_minor: amountMinor,
        currency_code: form.currency_code,
      })
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
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.product_code}
              onChange={(e) => setForm((c) => ({ ...c, product_code: e.target.value }))}
            >
              <option value="">{t("deposit.placeholder.select")}</option>
              {products.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.code} — {p.name} ({p.term_months} {t("deposit.products.months_short")}, {p.interest_rate}%)
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>{t("deposit.savings.field.amount")}</Label>
              <Input
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))}
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
              <Input
                type="date"
                value={form.open_date}
                onChange={(e) => setForm((c) => ({ ...c, open_date: e.target.value }))}
              />
            </div>
          </div>
        </div>
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
