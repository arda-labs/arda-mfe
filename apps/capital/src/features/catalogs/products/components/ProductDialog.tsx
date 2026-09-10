import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { capitalApi, type CapitalProduct, type FundType } from "../../../api"

/** Create/edit one fund product (CFM catalog). */
export function ProductDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: CapitalProduct | null
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [fundTypeCode, setFundTypeCode] = useState("")
  const [termMonths, setTermMonths] = useState("0")
  const [interestRate, setInterestRate] = useState("0")
  const [currencyCode, setCurrencyCode] = useState("VND")
  const [fundTypes, setFundTypes] = useState<FundType[]>([])
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setCode(product?.code ?? "")
    setName(product?.name ?? "")
    setFundTypeCode(product?.fund_type_code ?? "")
    setTermMonths(String(product?.term_months ?? 0))
    setInterestRate(String(product?.interest_rate ?? 0))
    setCurrencyCode(product?.currency_code ?? "VND")
    void capitalApi
      .listFundTypes()
      .then((result) => setFundTypes(result.items))
      .catch(() => setFundTypes([]))
  }, [open, product])

  const submit = async () => {
    if (!code.trim() || !name.trim() || !fundTypeCode) {
      notify.error(t("capital.catalogs.validation.required"))
      return
    }
    setPending(true)
    try {
      await capitalApi.upsertProduct({
        code: code.trim(),
        name: name.trim(),
        fund_type_code: fundTypeCode,
        term_months: Number(termMonths) || 0,
        interest_rate: Number(interestRate) || 0,
        currency_code: currencyCode.toUpperCase(),
      })
      notify.success(t("capital.catalogs.save_success"))
      onOpenChange(false)
      await onSaved()
    } catch {
      notify.error(t("capital.catalogs.save_failed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {product ? t("capital.products.edit") : t("capital.products.create")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("common.field.code")}</Label>
            <Input
              value={code}
              disabled={Boolean(product)}
              className="font-mono"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("common.field.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("capital.contracts.field.fund_type")}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={fundTypeCode}
              onChange={(e) => setFundTypeCode(e.target.value)}
            >
              <option value="">{t("capital.placeholder.select")}</option>
              {fundTypes.map((type) => (
                <option key={type.id} value={type.code}>
                  {type.code} — {type.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("capital.products.field.term_months")}</Label>
            <Input
              inputMode="numeric"
              value={termMonths}
              onChange={(e) => setTermMonths(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("capital.contracts.field.interest_rate")}</Label>
            <Input
              inputMode="decimal"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("common.field.currency")}</Label>
            <Input
              value={currencyCode}
              maxLength={3}
              onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.action.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={pending}>
            {t("common.action.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
