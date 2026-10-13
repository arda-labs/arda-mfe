import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { attachStagedCaseFiles, useStagedAttachments } from "@workspace/case-tabs"
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
import { todayISO } from "@workspace/format"
import { depositApi, type InterestRate } from "../../api"

/** Stage a rate register/adjust request (DPM.100/101) as a maker/checker case. */
export function RateDialog({
  open,
  onOpenChange,
  onSaved,
  editing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void> | void
  editing?: InterestRate | null
}) {
  const { t } = useI18n()
  const staged = useStagedAttachments({ module: "deposit" })
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
    if (editing) {
      // Adjusting an existing tier starts as an ADJUST request with the current
      // values prefilled so the maker only changes what is needed.
      setRequestType("ADJUST")
      setProductCode(editing.product_code ?? "")
      setTermMonths(String(editing.term_months))
      setRate(String(editing.rate))
      setDenominator(String(editing.denominator))
      setMethod(editing.method)
      setEffectiveFrom(editing.effective_from || todayISO())
      return
    }
    setRequestType("REGISTER")
    setProductCode("")
    setTermMonths("0")
    setRate("")
    setDenominator("365")
    setMethod("SIMPLE")
    setEffectiveFrom(todayISO())
  }, [open, editing])

  const submit = async () => {
    if (!rate || Number(rate) <= 0 || !effectiveFrom) {
      notify.error(t("deposit.rates.validation.required"))
      return
    }
    setPending(true)
    try {
      const created = await depositApi.submitRate({
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
      try {
        await attachStagedCaseFiles(staged.ids, created.workflow_case_id ?? "")
      } catch {
        notify.error(t("common.case_tabs.attachments.attach_error"))
      }
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
          <DialogTitle>
            {editing
              ? t("deposit.rates.dialog_edit_title")
              : t("deposit.rates.dialog_title")}
          </DialogTitle>
          <DialogDescription>{t("deposit.rates.dialog_description")}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("deposit.rates.field.request_type")}</Label>
            <SelectField
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as "REGISTER" | "ADJUST" | "EDIT")}
              options={(["REGISTER", "ADJUST", "EDIT"] as const).map((value) => ({
                value,
                label: t(`deposit.rates.request_type.${value}`),
              }))}
            />
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
            <SelectField
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              options={[
                { value: "SIMPLE", label: "SIMPLE" },
                { value: "COMPOUND", label: "COMPOUND" },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.rates.field.denominator")}</Label>
            <SelectField
              value={denominator}
              onChange={(e) => setDenominator(e.target.value)}
              options={[
                { value: "365", label: "365" },
                { value: "360", label: "360" },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.rates.field.effective_from")}</Label>
            <DateField
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </div>
        </div>
        {staged.tab.content}
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
