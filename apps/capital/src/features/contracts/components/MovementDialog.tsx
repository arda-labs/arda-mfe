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
import { capitalApi } from "../../api"

const MOVEMENT_TYPES = ["RECEIPT", "DISBURSEMENT", "PAYMENT", "SETTLEMENT"] as const

/** Stage one fund movement (RECEIPT/DISBURSEMENT/PAYMENT/SETTLEMENT) as a case. */
export function MovementDialog({
  open,
  onOpenChange,
  contractId,
  currencyCode,
  defaultType,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractId: string
  currencyCode: string
  defaultType: string
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [movementType, setMovementType] = useState(defaultType)
  const [amount, setAmount] = useState("")
  const [movementDate, setMovementDate] = useState(todayISO())
  const [note, setNote] = useState("")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setMovementType(defaultType)
    setAmount("")
    setNote("")
    setMovementDate(todayISO())
  }, [defaultType, open])

  const submit = async () => {
    const amountMinor = toMinor(Number(amount) || 0, currencyCode)
    if (amountMinor <= 0 || !movementDate) {
      notify.error(t("capital.movements.validation.required"))
      return
    }
    setPending(true)
    try {
      await capitalApi.recordMovement(contractId, {
        movement_type: movementType,
        amount_minor: amountMinor,
        movement_date: movementDate,
        note: note || undefined,
      })
      notify.success(t("capital.movements.submit_success"))
      onOpenChange(false)
      await onSaved()
    } catch {
      notify.error(t("capital.movements.submit_failed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("capital.movements.dialog_title")}</DialogTitle>
          <DialogDescription>{t("capital.movements.dialog_description")}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("capital.movements.field.type")}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
            >
              {MOVEMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`capital.movement_type.${type}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("capital.movements.field.date")}</Label>
            <Input
              type="date"
              value={movementDate}
              onChange={(e) => setMovementDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("capital.movements.field.amount")}</Label>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("capital.movements.field.note")}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
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
