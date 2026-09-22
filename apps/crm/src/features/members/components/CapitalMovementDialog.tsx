import { useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import type { CrmMember } from "../../api"
import { formatMinor } from "./member-labels"

const REQUEST_TYPES = ["REGISTER", "ADDITIONAL", "WITHDRAW"] as const
type RequestType = (typeof REQUEST_TYPES)[number]

/**
 * CapitalMovementDialog stages one member capital movement. The amount is
 * entered in VND and submitted as minor units (VND has no decimals, so the
 * number is passed through unchanged) — matching how the backend stores money.
 */
export function CapitalMovementDialog({
  member,
  open,
  onOpenChange,
  onSubmit,
}: {
  member: CrmMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: {
    member_id: string
    request_type: RequestType
    amount_minor: number
    effective_date?: string
    reason?: string
  }) => Promise<void>
}) {
  const { t } = useI18n()
  const [requestType, setRequestType] = useState<RequestType>("ADDITIONAL")
  const [amount, setAmount] = useState("")
  const [effectiveDate, setEffectiveDate] = useState("")
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)

  const amountValue = Number(amount.replace(/[^\d]/g, ""))

  const submit = async () => {
    if (!member) return
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      notify.error(t("members.capital.amount_required"))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        member_id: member.id,
        request_type: requestType,
        amount_minor: amountValue,
        effective_date: effectiveDate || undefined,
        reason: reason || undefined,
      })
      onOpenChange(false)
      setAmount("")
      setReason("")
      setEffectiveDate("")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("members.capital.title")}</DialogTitle>
          <DialogDescription>
            {member
              ? t("members.capital.subtitle", {
                  code: member.member_code,
                  capital: formatMinor(member.total_capital_minor),
                })
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{t("members.capital.requestType")}</Label>
            <Select value={requestType} onValueChange={(v) => setRequestType(v as RequestType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REGISTER">{t("members.request.register")}</SelectItem>
                <SelectItem value="ADDITIONAL">{t("members.request.additional")}</SelectItem>
                <SelectItem value="WITHDRAW">{t("members.request.withdraw")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="member-amount">{t("members.capital.amount")}</Label>
            <Input
              id="member-amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
            {amountValue > 0 ? (
              <span className="text-xs text-muted-foreground">
                {formatMinor(amountValue)} VND
              </span>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="member-effective">{t("members.capital.effectiveDate")}</Label>
            <Input
              id="member-effective"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="member-reason">{t("members.capital.reason")}</Label>
            <Input
              id="member-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("common.action.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {t("members.capital.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
