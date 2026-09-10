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
import { depositApi, type IbmProduct } from "../../api"

/** Stage an IBM contract placement (IBM.200.01) as a maker/checker case. */
export function PlaceInterbankDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [depositCode, setDepositCode] = useState("")
  const [counterpartyCode, setCounterpartyCode] = useState("")
  const [counterpartyName, setCounterpartyName] = useState("")
  const [productCode, setProductCode] = useState("")
  const [depositDate, setDepositDate] = useState(todayISO())
  const [maturityDate, setMaturityDate] = useState("")
  const [principal, setPrincipal] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [currencyCode, setCurrencyCode] = useState("VND")
  const [products, setProducts] = useState<IbmProduct[]>([])
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setDepositCode("")
    setCounterpartyCode("")
    setCounterpartyName("")
    setProductCode("")
    setDepositDate(todayISO())
    setMaturityDate("")
    setPrincipal("")
    setInterestRate("")
    setCurrencyCode("VND")
    void depositApi
      .listIbmProducts()
      .then((result) => setProducts(result.items))
      .catch(() => setProducts([]))
  }, [open])

  const submit = async () => {
    const principalMinor = toMinor(Number(principal) || 0, currencyCode)
    if (!depositCode.trim() || !counterpartyCode.trim() || principalMinor <= 0 || !maturityDate) {
      notify.error(t("deposit.interbank.validation.required"))
      return
    }
    setPending(true)
    try {
      await depositApi.createInterbank({
        deposit_code: depositCode.trim(),
        counterparty_code: counterpartyCode.trim(),
        counterparty_name: counterpartyName.trim() || undefined,
        product_code: productCode || undefined,
        deposit_date: depositDate,
        maturity_date: maturityDate,
        principal_minor: principalMinor,
        interest_rate: Number(interestRate) || 0,
        currency_code: currencyCode.toUpperCase(),
      })
      notify.success(t("deposit.interbank.create_success"))
      onOpenChange(false)
      await onSaved()
    } catch {
      notify.error(t("deposit.interbank.create_failed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deposit.interbank.create_title")}</DialogTitle>
          <DialogDescription>{t("deposit.interbank.create_description")}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("deposit.interbank.field.deposit_code")}</Label>
            <Input value={depositCode} onChange={(e) => setDepositCode(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.interbank.field.counterparty")}</Label>
            <Input
              value={counterpartyCode}
              onChange={(e) => setCounterpartyCode(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.interbank.field.counterparty_name")}</Label>
            <Input
              value={counterpartyName}
              onChange={(e) => setCounterpartyName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.interbank.field.product")}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
            >
              <option value="">{t("deposit.placeholder.select")}</option>
              {products.map((product) => (
                <option key={product.id} value={product.code}>
                  {product.code} — {product.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.interbank.field.deposit_date")}</Label>
            <Input
              type="date"
              value={depositDate}
              onChange={(e) => setDepositDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.interbank.field.maturity_date")}</Label>
            <Input
              type="date"
              value={maturityDate}
              onChange={(e) => setMaturityDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.interbank.field.principal")}</Label>
            <Input
              inputMode="decimal"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.interbank.field.interest_rate")}</Label>
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
            {t("common.action.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
