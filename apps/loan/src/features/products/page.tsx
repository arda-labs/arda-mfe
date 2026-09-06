import { useCallback, useEffect, useState } from "react"
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
import { Label } from "@workspace/ui/components/label"
import { PageHeader } from "@workspace/ui/components/page-header"
import { productApi, type LoanProduct } from "../api"

type ProductForm = {
  code: string
  name: string
  product_type: "TERM" | "LIMIT"
  currency_code: string
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
  currency_code: "VND",
  interest_rate: "",
  loan_term_from: "",
  loan_term_to: "",
  min_amount: "",
  max_amount: "",
  acc_classification: "",
}

export function ProductsPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const [products, setProducts] = useState<LoanProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [savePending, setSavePending] = useState(false)
  const [form, setForm] = useState<ProductForm>(emptyForm)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const result = await productApi.listProducts()
      setProducts(result)
    } catch (error) {
      notify.error(translateApiError(error, t("loan_products.load_failed")))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const submitCreate = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      notify.error(t("loan_products.validation.required"))
      return
    }
    setSavePending(true)
    try {
      await productApi.upsertProduct({
        code: form.code.trim(),
        name: form.name.trim(),
        product_type: form.product_type,
        currency_code: form.currency_code,
        interest_rate: form.interest_rate ? Number(form.interest_rate) : undefined,
        loan_term_from: form.loan_term_from ? Number(form.loan_term_from) : undefined,
        loan_term_to: form.loan_term_to ? Number(form.loan_term_to) : undefined,
        min_amount: form.min_amount ? Number(form.min_amount) : undefined,
        max_amount: form.max_amount ? Number(form.max_amount) : undefined,
        acc_classification: form.acc_classification.trim() || undefined,
      })
      notify.success(t("loan_products.saved"))
      setDialogOpen(false)
      await loadProducts()
    } catch (error) {
      notify.error(translateApiError(error, t("loan_products.save_failed")))
    } finally {
      setSavePending(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("loan_products.title")}
        description={t("loan_products.description")}
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm)
              setDialogOpen(true)
            }}
          >
            {t("loan_products.create")}
          </Button>
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("loan.loading")}</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("loan.empty")}</p>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">{t("loan_products.field.code")}</th>
                <th className="px-3 py-2 font-medium">{t("loan_products.field.name")}</th>
                <th className="px-3 py-2 font-medium">{t("loan_products.field.type")}</th>
                <th className="px-3 py-2 font-medium">{t("loan_products.field.rate")}</th>
                <th className="px-3 py-2 font-medium">{t("loan_products.field.term")}</th>
                <th className="px-3 py-2 font-medium">{t("loan_products.field.classification")}</th>
                <th className="px-3 py-2 font-medium">{t("loan.field.status")}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-[13px]">{product.code}</td>
                  <td className="px-3 py-2">{product.name}</td>
                  <td className="px-3 py-2">{product.product_type}</td>
                  <td className="px-3 py-2 tabular-nums">{product.interest_rate ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {product.loan_term_from != null || product.loan_term_to != null
                      ? `${product.loan_term_from ?? "?"}–${product.loan_term_to ?? "?"} ${product.term_unit}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-[13px]">
                    {product.acc_classification || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={product.is_active ? "default" : "outline"}>
                      {product.is_active ? t("mdm_status_active") : t("mdm_status_inactive")}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("loan_products.create")}</DialogTitle>
            <DialogDescription>{t("loan_products.dialog_description")}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prd-code">{t("loan_products.field.code")}</Label>
              <Input
                id="prd-code"
                value={form.code}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prd-name">{t("loan_products.field.name")}</Label>
              <Input
                id="prd-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prd-rate">{t("loan_products.field.rate")}</Label>
              <Input
                id="prd-rate"
                type="number"
                step="0.01"
                value={form.interest_rate}
                onChange={(event) => setForm((current) => ({ ...current, interest_rate: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prd-class">{t("loan_products.field.classification")}</Label>
              <Input
                id="prd-class"
                value={form.acc_classification}
                onChange={(event) => setForm((current) => ({ ...current, acc_classification: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prd-min">{t("loan_products.field.min_amount")}</Label>
              <Input
                id="prd-min"
                type="number"
                value={form.min_amount}
                onChange={(event) => setForm((current) => ({ ...current, min_amount: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prd-max">{t("loan_products.field.max_amount")}</Label>
              <Input
                id="prd-max"
                type="number"
                value={form.max_amount}
                onChange={(event) => setForm((current) => ({ ...current, max_amount: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("loan_products.cancel")}
            </Button>
            <Button onClick={() => void submitCreate()} disabled={savePending}>
              {t("loan_products.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
