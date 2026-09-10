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
import { toMinor } from "@workspace/format"
import { capitalApi } from "../../api"

/** Stage one contract amendment (whitelisted fields) as a maker/checker case. */
export function AmendmentDialog({
  open,
  onOpenChange,
  contractId,
  currencyCode,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractId: string
  currencyCode: string
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [amount, setAmount] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [contractDate, setContractDate] = useState("")
  const [maturityDate, setMaturityDate] = useState("")
  const [reason, setReason] = useState("")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setAmount("")
    setInterestRate("")
    setContractDate("")
    setMaturityDate("")
    setReason("")
  }, [open])

  const submit = async () => {
    const payload: Record<string, unknown> = {}
    if (amount) payload.amount_minor = toMinor(Number(amount) || 0, currencyCode)
    if (interestRate) payload.interest_rate = Number(interestRate)
    if (contractDate) payload.contract_date = contractDate
    if (maturityDate) payload.maturity_date = maturityDate
    if (Object.keys(payload).length === 0) {
      notify.error(t("capital.amendments.validation.required"))
      return
    }
    setPending(true)
    try {
      await capitalApi.submitAmendment(contractId, { payload, reason: reason || undefined })
      notify.success(t("capital.amendments.submit_success"))
      onOpenChange(false)
      await onSaved()
    } catch {
      notify.error(t("capital.amendments.submit_failed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("capital.amendments.dialog_title")}</DialogTitle>
          <DialogDescription>{t("capital.amendments.dialog_description")}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("capital.contracts.field.amount")}</Label>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
            <Label>{t("capital.contracts.field.contract_date")}</Label>
            <Input
              type="date"
              value={contractDate}
              onChange={(e) => setContractDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("capital.contracts.field.maturity_date")}</Label>
            <Input
              type="date"
              value={maturityDate}
              onChange={(e) => setMaturityDate(e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>{t("capital.amendments.field.reason")}</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
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
