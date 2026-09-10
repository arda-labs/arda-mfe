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
import { depositApi } from "../../api"

const KINDS = ["TOP_UP", "INTEREST", "EXPECTED", "WITHDRAW"] as const

/** Stage one IBM movement (IBM.300/301/302/304) as a maker/checker case. */
export function IbmMovementDialog({
  open,
  onOpenChange,
  depositId,
  currencyCode,
  defaultKind,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  depositId: string
  currencyCode: string
  defaultKind: string
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [kind, setKind] = useState(defaultKind)
  const [amount, setAmount] = useState("")
  const [movementDate, setMovementDate] = useState(todayISO())
  const [periodFrom, setPeriodFrom] = useState("")
  const [periodTo, setPeriodTo] = useState("")
  const [note, setNote] = useState("")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setKind(defaultKind)
    setAmount("")
    setMovementDate(todayISO())
    setPeriodFrom("")
    setPeriodTo("")
    setNote("")
  }, [defaultKind, open])

  const submit = async () => {
    const amountMinor = toMinor(Number(amount) || 0, currencyCode)
    if (amountMinor <= 0 || !movementDate) {
      notify.error(t("deposit.interbank.movement.validation.required"))
      return
    }
    setPending(true)
    try {
      await depositApi.submitIbmMovement(depositId, {
        kind: kind as (typeof KINDS)[number],
        amount_minor: amountMinor,
        movement_date: movementDate,
        period_from: periodFrom || undefined,
        period_to: periodTo || undefined,
        note: note || undefined,
      })
      notify.success(t("deposit.interbank.movement.submit_success"))
      onOpenChange(false)
      await onSaved()
    } catch {
      notify.error(t("deposit.interbank.movement.submit_failed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deposit.interbank.movement.dialog_title")}</DialogTitle>
          <DialogDescription>
            {t("deposit.interbank.movement.dialog_description")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("deposit.interbank.movement.field.kind")}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              {KINDS.map((value) => (
                <option key={value} value={value}>
                  {t(`deposit.interbank.movement_kind.${value}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.interbank.movement.field.date")}</Label>
            <Input
              type="date"
              value={movementDate}
              onChange={(e) => setMovementDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.interbank.movement.field.amount")}</Label>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.interbank.movement.field.period_from")}</Label>
            <Input
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.interbank.movement.field.period_to")}</Label>
            <Input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("deposit.interbank.movement.field.note")}</Label>
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
