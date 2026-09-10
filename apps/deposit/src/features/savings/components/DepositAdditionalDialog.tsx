import { useState } from "react"
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
import { toMinor, todayISO } from "@workspace/format"
import { depositApi } from "../../api"

/**
 * DPM.301 additional deposit — submits the maker/checker case; the principal
 * only moves when the checker approves in the workbench.
 */
export function DepositAdditionalDialog({
  open,
  savingsCode,
  onOpenChange,
  onSubmitted,
}: {
  open: boolean
  savingsCode: string
  onOpenChange: (open: boolean) => void
  onSubmitted: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [amount, setAmount] = useState("")
  const [txnDate, setTxnDate] = useState(todayISO())
  const [pending, setPending] = useState(false)

  const submit = async () => {
    const amountMinor = toMinor(Number(amount) || 0)
    if (amountMinor <= 0) {
      notify.error(t("deposit.savings.deposit_validation"))
      return
    }
    setPending(true)
    try {
      const submission = await depositApi.depositAdditional(savingsCode, {
        amount_minor: amountMinor,
        txn_date: txnDate || undefined,
      })
      notify.success(
        t("deposit.savings.deposit_success"),
        submission.case_code
      )
      onOpenChange(false)
      setAmount("")
      setTxnDate(todayISO())
      await onSubmitted()
    } catch (error) {
      notify.error(
        t("deposit.savings.deposit_failed"),
        translateApiError(error, t("deposit.action_failed"))
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deposit.savings.deposit_title")}</DialogTitle>
          <DialogDescription>
            {t("deposit.savings.deposit_description", { code: savingsCode })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("deposit.savings.field.amount")}</Label>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.savings.field.txn_date")}</Label>
            <Input
              type="date"
              value={txnDate}
              onChange={(event) => setTxnDate(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.action.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={pending}>
            {t("deposit.savings.deposit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
