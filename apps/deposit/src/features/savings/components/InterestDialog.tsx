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
import { formatAmount, fromMinor, toMinor } from "@workspace/format"
import { depositApi } from "../../api"

/** Stage a pay/capitalize interest op (DPM.302/303) as a maker/checker case. */
export function InterestDialog({
  open,
  onOpenChange,
  savingsCode,
  accruedMinor,
  currencyCode,
  defaultOp,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  savingsCode: string
  accruedMinor: number
  currencyCode: string
  defaultOp: "PAY" | "CAPITALIZE"
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [opType, setOpType] = useState<"PAY" | "CAPITALIZE">(defaultOp)
  const [amount, setAmount] = useState("")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setOpType(defaultOp)
    setAmount(String(fromMinor(accruedMinor, currencyCode)))
  }, [accruedMinor, currencyCode, defaultOp, open])

  const submit = async () => {
    const amountMinor = toMinor(Number(amount) || 0, currencyCode)
    if (amountMinor <= 0 || amountMinor > accruedMinor) {
      notify.error(t("deposit.interest.validation.required"))
      return
    }
    setPending(true)
    try {
      await depositApi.submitSavingsInterest(savingsCode, {
        op_type: opType,
        amount_minor: amountMinor,
      })
      notify.success(t("deposit.interest.submit_success"))
      onOpenChange(false)
      await onSaved()
    } catch {
      notify.error(t("deposit.interest.submit_failed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deposit.interest.dialog_title")}</DialogTitle>
          <DialogDescription>{t("deposit.interest.dialog_description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            {t("deposit.interest.accrued_hint")}:{" "}
            <span className="font-medium text-foreground">
              {formatAmount(fromMinor(accruedMinor, currencyCode), currencyCode)}
            </span>
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.interest.field.op_type")}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={opType}
              onChange={(e) => setOpType(e.target.value as "PAY" | "CAPITALIZE")}
            >
              <option value="PAY">{t("deposit.interest.op_type.PAY")}</option>
              <option value="CAPITALIZE">{t("deposit.interest.op_type.CAPITALIZE")}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.interest.field.amount")}</Label>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
