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
import { todayISO } from "@workspace/format"
import { depositApi } from "../../api"

/** Stage a rate register/adjust request (DPM.100/101) as a maker/checker case. */
export function RateDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [requestType, setRequestType] = useState<"REGISTER" | "ADJUST" | "EDIT">("REGISTER")
  const [productCode, setProductCode] = useState("")
  const [termMonths, setTermMonths] = useState("0")
  const [rate, setRate] = useState("")
  const [denominator, setDenominator] = useState("365")
  const [method, setMethod] = useState("SIMPLE")
  const [effectiveFrom, setEffectiveFrom] = useState(todayISO())
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setRequestType("REGISTER")
    setProductCode("")
    setTermMonths("0")
    setRate("")
    setDenominator("365")
    setMethod("SIMPLE")
    setEffectiveFrom(todayISO())
  }, [open])

  const submit = async () => {
    if (!rate || Number(rate) <= 0 || !effectiveFrom) {
      notify.error(t("deposit.rates.validation.required"))
      return
    }
    setPending(true)
    try {
      await depositApi.submitRate({
        request_type: requestType,
        payload: {
          product_code: productCode.trim() || undefined,
          term_months: Number(termMonths) || 0,
          method,
          denominator: Number(denominator) || 365,
          rate: Number(rate),
          effective_from: effectiveFrom,
        },
      })
      notify.success(t("deposit.rates.submit_success"))
      onOpenChange(false)
      await onSaved()
    } catch {
      notify.error(t("deposit.rates.submit_failed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deposit.rates.dialog_title")}</DialogTitle>
          <DialogDescription>{t("deposit.rates.dialog_description")}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("deposit.rates.field.request_type")}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as "REGISTER" | "ADJUST" | "EDIT")}
            >
              <option value="REGISTER">{t("deposit.rates.request_type.REGISTER")}</option>
              <option value="ADJUST">{t("deposit.rates.request_type.ADJUST")}</option>
              <option value="EDIT">{t("deposit.rates.request_type.EDIT")}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.rates.field.product")}</Label>
            <Input
              value={productCode}
              placeholder={t("deposit.rates.field.product_hint")}
              onChange={(e) => setProductCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.products.field.term_months")}</Label>
            <Input
              inputMode="numeric"
              value={termMonths}
              onChange={(e) => setTermMonths(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.products.field.interest_rate")}</Label>
            <Input
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.rates.field.method")}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="SIMPLE">SIMPLE</option>
              <option value="COMPOUND">COMPOUND</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.rates.field.denominator")}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={denominator}
              onChange={(e) => setDenominator(e.target.value)}
            >
              <option value="365">365</option>
              <option value="360">360</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.rates.field.effective_from")}</Label>
            <Input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
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
