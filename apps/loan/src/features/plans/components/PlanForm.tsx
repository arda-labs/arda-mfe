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
import { fromMinor, toMinor } from "@workspace/format"
import { loanPlanApi, type LoanPlan } from "../../api"

/**
 * Create/edit dialog for a loan plan (W7). The plan code is the upsert key,
 * so it stays locked while editing — mirrors the previous inline form.
 */
export function PlanForm({
  open,
  onOpenChange,
  plan,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: LoanPlan | null
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [target, setTarget] = useState("")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setCode(plan?.code ?? "")
    setName(plan?.name ?? "")
    setFromDate(plan?.from_date ?? "")
    setToDate(plan?.to_date ?? "")
    setTarget(plan ? String(fromMinor(plan.target_amount_minor, "VND")) : "")
    setNote(plan?.note ?? "")
  }, [open, plan])

  const submit = async () => {
    if (!code.trim() || !name.trim()) {
      notify.error(t("loan.plans.validation.required"))
      return
    }
    setSaving(true)
    try {
      await loanPlanApi.upsert({
        code: code.trim(),
        name: name.trim(),
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        target_amount_minor: toMinor(Number(target) || 0, "VND"),
        note,
        status: "ACTIVE",
      })
      notify.success(t("loan.plans.save_success"))
      onOpenChange(false)
      await onSaved()
    } catch {
      notify.error(t("loan.plans.save_failed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {plan ? t("loan.plans.edit") : t("loan.plans.create")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="plan-code">{t("common.field.code")}</Label>
            <Input
              id="plan-code"
              value={code}
              disabled={Boolean(plan)}
              className="font-mono"
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-name">{t("common.field.name")}</Label>
            <Input
              id="plan-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-from">{t("loan.plans.field.from_date")}</Label>
            <Input
              id="plan-from"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-to">{t("loan.plans.field.to_date")}</Label>
            <Input
              id="plan-to"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-target">{t("loan.plans.field.target")}</Label>
            <Input
              id="plan-target"
              inputMode="decimal"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="plan-note">{t("loan.plans.field.note")}</Label>
            <Input
              id="plan-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.action.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {t("common.action.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
