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
import { parseMoneyInput } from "@workspace/format"
import { loanApi, productApi, type LoanProduct } from "../../api"

/** Create + submit-to-approval dialog for a credit contract. */
export function ContractDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void>
}) {
  const { t } = useI18n()
  const [products, setProducts] = useState<LoanProduct[]>([])
  const [savePending, setSavePending] = useState(false)
  const [form, setForm] = useState({
    contract_code: "",
    contract_no: "",
    customer_code: "",
    product_code: "",
    loan_amt: "",
    loan_term: "",
  })

  useEffect(() => {
    if (!open) return
    setForm({
      contract_code: "",
      contract_no: "",
      customer_code: "",
      product_code: "",
      loan_amt: "",
      loan_term: "",
    })
    productApi
      .listProducts()
      .then(setProducts)
      .catch(() => setProducts([]))
  }, [open])

  const submit = async () => {
    if (!form.contract_code.trim() || !form.customer_code.trim()) {
      notify.error(t("loan.validation.required"))
      return
    }
    const amount = parseMoneyInput(form.loan_amt)
    if (amount == null || amount <= 0) {
      notify.error(t("loan.validation.amount"))
      return
    }
    setSavePending(true)
    try {
      const created = await loanApi.createContract({
        contract_code: form.contract_code.trim(),
        contract_no: form.contract_no.trim() || undefined,
        customer_code: form.customer_code.trim(),
        product_code: form.product_code || undefined,
        loan_amt: amount,
        loan_term: form.loan_term ? Number(form.loan_term) : undefined,
      })
      // Submit straight into the multi-level formation case.
      await loanApi.submitContract(created.id)
      notify.success(t("loan.submitted"))
      onOpenChange(false)
      await onSaved()
    } catch (error) {
      notify.error(translateApiError(error, t("loan.submit_failed")))
    } finally {
      setSavePending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("loan.create")}</DialogTitle>
          <DialogDescription>{t("loan.dialog_description")}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ctrt-code">{t("loan.field.contract_code")}</Label>
            <Input
              id="ctrt-code"
              value={form.contract_code}
              onChange={(event) =>
                setForm((current) => ({ ...current, contract_code: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ctrt-no">{t("loan.field.contract_no")}</Label>
            <Input
              id="ctrt-no"
              value={form.contract_no}
              onChange={(event) =>
                setForm((current) => ({ ...current, contract_no: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ctrt-customer">{t("loan.field.customer")}</Label>
            <Input
              id="ctrt-customer"
              value={form.customer_code}
              onChange={(event) =>
                setForm((current) => ({ ...current, customer_code: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ctrt-product">{t("loan.field.product")}</Label>
            <Select
              value={form.product_code || undefined}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, product_code: value }))
              }
            >
              <SelectTrigger id="ctrt-product">
                <SelectValue placeholder={t("loan.placeholder.product")} />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.code}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ctrt-amount">{t("loan.field.amount")}</Label>
            <Input
              id="ctrt-amount"
              inputMode="numeric"
              placeholder="1.250.000"
              value={form.loan_amt}
              onChange={(event) =>
                setForm((current) => ({ ...current, loan_amt: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ctrt-term">{t("loan.field.term")}</Label>
            <Input
              id="ctrt-term"
              type="number"
              value={form.loan_term}
              onChange={(event) =>
                setForm((current) => ({ ...current, loan_term: event.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("loan.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={savePending}>
            {t("loan.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
