import { useEffect, useState } from "react"
import { useI18n, translateApiError } from "@workspace/i18n"
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
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { notify } from "@workspace/ui/feedback/notify"
import {
  interestRateApi,
  type InterestApplyType,
  type InterestRate,
  type InterestRateType,
} from "../../api"

const RATE_TYPES: InterestRateType[] = ["central", "loan", "deposit"]
const APPLY_TYPES: InterestApplyType[] = ["by_balance", "by_term", "negotiated"]

type RateForm = {
  code: string
  name: string
  rate_type: InterestRateType
  apply_type: InterestApplyType
  currency_code: string
  description: string
}

const emptyForm: RateForm = {
  code: "",
  name: "",
  rate_type: "loan",
  apply_type: "by_balance",
  currency_code: "",
  description: "",
}

/** Create/edit dialog for the interest-rate master record (no tiers here). */
export function InterestRateDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: InterestRate | null
  onSaved: () => Promise<void>
}) {
  const { t } = useI18n()
  const [form, setForm] = useState<RateForm>(emptyForm)
  const [savePending, setSavePending] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        code: editing.code,
        name: editing.name,
        rate_type: editing.rate_type,
        apply_type: editing.apply_type,
        currency_code: editing.currency_code ?? "",
        description: editing.description ?? "",
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, editing])

  const submit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      notify.error(t("mdm.validation.code_name_required"))
      return
    }
    setSavePending(true)
    try {
      const body = {
        code: form.code.trim(),
        name: form.name.trim(),
        rate_type: form.rate_type,
        apply_type: form.apply_type,
        currency_code: form.currency_code.trim().toUpperCase() || undefined,
        description: form.description.trim() || undefined,
      }
      if (editing) {
        await interestRateApi.update(editing.id, body)
      } else {
        await interestRateApi.create(body)
      }
      notify.success(t("mdm.saved"))
      onOpenChange(false)
      await onSaved()
    } catch (error) {
      notify.error(translateApiError(error, t("mdm.save_failed")))
    } finally {
      setSavePending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? t("mdm.interest_rates.edit") : t("mdm.interest_rates.create")}
          </DialogTitle>
          <DialogDescription>
            {t("mdm.interest_rates.dialog_description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="rate-code">{t("mdm.interest_rates.field.code")}</Label>
            <Input
              id="rate-code"
              value={form.code}
              disabled={Boolean(editing)}
              onChange={(event) =>
                setForm((current) => ({ ...current, code: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rate-name">{t("mdm.interest_rates.field.name")}</Label>
            <Input
              id="rate-name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("mdm.interest_rates.field.rate_type")}</Label>
              <Select
                value={form.rate_type}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    rate_type: value as InterestRateType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RATE_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`mdm.interest_rates.rate_type.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("mdm.interest_rates.field.apply_type")}</Label>
              <Select
                value={form.apply_type}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    apply_type: value as InterestApplyType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLY_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`mdm.interest_rates.apply_type.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rate-currency">{t("mdm.interest_rates.field.currency")}</Label>
            <Input
              id="rate-currency"
              placeholder="VND"
              maxLength={3}
              value={form.currency_code}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  currency_code: event.target.value.toUpperCase(),
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rate-description">{t("mdm.field.description")}</Label>
            <Textarea
              id="rate-description"
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("mdm.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={savePending}>
            {t("mdm.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
