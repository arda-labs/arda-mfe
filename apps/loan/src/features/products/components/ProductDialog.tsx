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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { fromMinor, parseMoneyInput, toMinor } from "@workspace/format"
import { productApi, type LoanProduct } from "../../api"

type ProductForm = {
  code: string
  name: string
  product_type: "TERM" | "LIMIT"
  interest_rate: string
  loan_term_from: string
  loan_term_to: string
  min_amount: string
  max_amount: string
  acc_classification: string
}

const emptyForm: ProductForm = {
  code: "",
  name: "",
  product_type: "TERM",
  interest_rate: "",
  loan_term_from: "",
  loan_term_to: "",
  min_amount: "",
  max_amount: "",
  acc_classification: "",
}

/** Create/update dialog for a credit product (upsert by code). */
export function ProductDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: LoanProduct | null
  onSaved: () => Promise<void>
}) {
  const { t } = useI18n()
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [savePending, setSavePending] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        code: editing.code,
        name: editing.name,
        product_type: editing.product_type,
        interest_rate: editing.interest_rate?.toString() ?? "",
        loan_term_from: editing.loan_term_from?.toString() ?? "",
        loan_term_to: editing.loan_term_to?.toString() ?? "",
        min_amount: editing.min_amount_minor != null ? String(fromMinor(editing.min_amount_minor)) : "",
        max_amount: editing.max_amount_minor != null ? String(fromMinor(editing.max_amount_minor)) : "",
        acc_classification: editing.acc_classification ?? "",
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, editing])

  const submit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      notify.error(t("loan.loan_products.validation.required"))
      return
    }
    const maxAmount = form.max_amount ? toMinor(parseMoneyInput(form.max_amount) ?? 0) : undefined
    const minAmount = form.min_amount ? toMinor(parseMoneyInput(form.min_amount) ?? 0) : undefined
    setSavePending(true)
    try {
      await productApi.upsertProduct({
        code: form.code.trim(),
        name: form.name.trim(),
        product_type: form.product_type,
        interest_rate: form.interest_rate ? Number(form.interest_rate) : undefined,
        loan_term_from: form.loan_term_from ? Number(form.loan_term_from) : undefined,
        loan_term_to: form.loan_term_to ? Number(form.loan_term_to) : undefined,
        min_amount_minor: minAmount,
        max_amount_minor: maxAmount,
        acc_classification: form.acc_classification.trim() || undefined,
      })
      notify.success(t("loan.loan_products.saved"))
      onOpenChange(false)
      await onSaved()
    } catch (error) {
      notify.error(translateApiError(error, t("loan.loan_products.save_failed")))
    } finally {
      setSavePending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? t("loan.loan_products.edit") : t("loan.loan_products.create")}
          </DialogTitle>
          <DialogDescription>{t("loan.loan_products.dialog_description")}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="prd-code">{t("loan.loan_products.field.code")}</Label>
            <Input
              id="prd-code"
              value={form.code}
              disabled={Boolean(editing)}
              onChange={(event) =>
                setForm((current) => ({ ...current, code: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prd-name">{t("loan.loan_products.field.name")}</Label>
            <Input
              id="prd-name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prd-type">{t("loan.loan_products.field.type")}</Label>
            <Select
              value={form.product_type}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  product_type: value as ProductForm["product_type"],
                }))
              }
            >
              <SelectTrigger id="prd-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TERM">TERM</SelectItem>
                <SelectItem value="LIMIT">LIMIT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prd-rate">{t("loan.loan_products.field.rate")}</Label>
            <Input
              id="prd-rate"
              type="number"
              step="0.01"
              value={form.interest_rate}
              onChange={(event) =>
                setForm((current) => ({ ...current, interest_rate: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prd-min">{t("loan.loan_products.field.min_amount")}</Label>
            <Input
              id="prd-min"
              inputMode="numeric"
              value={form.min_amount}
              onChange={(event) =>
                setForm((current) => ({ ...current, min_amount: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prd-max">{t("loan.loan_products.field.max_amount")}</Label>
            <Input
              id="prd-max"
              inputMode="numeric"
              value={form.max_amount}
              onChange={(event) =>
                setForm((current) => ({ ...current, max_amount: event.target.value }))
              }
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="prd-class">{t("loan.loan_products.field.classification")}</Label>
            <Input
              id="prd-class"
              value={form.acc_classification}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  acc_classification: event.target.value,
                }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("loan.loan_products.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={savePending}>
            {t("loan.loan_products.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
