import { useEffect, useState } from "react"
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
import { parseMoneyInput, toMinor } from "@workspace/format"
import { vfuApi } from "../../api"

export type VfuDialogTarget = "party" | "mandate" | "plan" | null

export type VfuDialogEditing = {
  id: string
  code: string
  name: string
  extra: string
} | null

/** Create/edit dialog shared by the three VFU entity tables. */
export function VfuCreateDialog({
  target,
  onOpenChange,
  onSaved,
  editing,
}: {
  target: VfuDialogTarget
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void>
  editing?: VfuDialogEditing
}) {
  const { t } = useI18n()
  const [form, setForm] = useState({ code: "", name: "", extra: "" })
  const [savePending, setSavePending] = useState(false)

  useEffect(() => {
    if (!target) return
    setForm(
      editing
        ? { code: editing.code, name: editing.name, extra: editing.extra }
        : { code: "", name: "", extra: "" }
    )
  }, [target, editing])

  const labels: Record<
    Exclude<VfuDialogTarget, null>,
    { code: string; name: string; extra: string }
  > = {
    party: {
      code: t("loan.loan_vfu.field.party_code"),
      name: t("loan.loan_vfu.field.party_name"),
      extra: "",
    },
    mandate: {
      code: t("loan.loan_vfu.field.mandate_code"),
      name: t("loan.loan_vfu.field.party_code"),
      extra: t("loan.loan_vfu.field.rep_name"),
    },
    plan: {
      code: t("loan.loan_vfu.field.plan_code"),
      name: t("loan.loan_vfu.field.mandate_code"),
      extra: t("loan.loan_vfu.field.allocated"),
    },
  }

  const submit = async () => {
    if (!form.code.trim()) {
      notify.error(t("loan.loan_vfu.validation.code_required"))
      return
    }
    setSavePending(true)
    try {
      if (target === "party") {
        const body = {
          party_code: form.code.trim(),
          party_name: form.name.trim(),
          party_type: "ORG" as const,
        }
        if (editing) await vfuApi.updateParty(editing.id, body)
        else await vfuApi.createParty(body)
      } else if (target === "mandate") {
        const body = {
          mandate_code: form.code.trim(),
          party_code: form.name.trim(),
          rep_name: form.extra.trim() || undefined,
        }
        if (editing) await vfuApi.updateMandate(editing.id, body)
        else await vfuApi.createMandate(body)
      } else if (target === "plan") {
        const body = {
          plan_code: form.code.trim(),
          mandate_code: form.name.trim(),
          allocated_amt_minor: toMinor(parseMoneyInput(form.extra) ?? 0),
        }
        if (editing) await vfuApi.updatePlan(editing.id, body)
        else await vfuApi.createPlan(body)
      }
      notify.success(t("loan.loan_vfu.saved"))
      onOpenChange(false)
      await onSaved()
    } catch (error) {
      notify.error(translateApiError(error, t("loan.loan_vfu.save_failed")))
    } finally {
      setSavePending(false)
    }
  }

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing
              ? t("loan.loan_vfu.edit_title")
              : t("loan.loan_vfu.create_title")}
          </DialogTitle>
          <DialogDescription>{t("loan.loan_vfu.dialog_description")}</DialogDescription>
        </DialogHeader>
        {target && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="vfu-code">{labels[target].code}</Label>
              <Input
                id="vfu-code"
                value={form.code}
                disabled={Boolean(editing)}
                onChange={(event) =>
                  setForm((current) => ({ ...current, code: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vfu-name">{labels[target].name}</Label>
              <Input
                id="vfu-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            {labels[target].extra && (
              <div className="space-y-1.5">
                <Label htmlFor="vfu-extra">{labels[target].extra}</Label>
                <Input
                  id="vfu-extra"
                  value={form.extra}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, extra: event.target.value }))
                  }
                />
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("loan.loan_vfu.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={savePending}>
            {t("loan.loan_vfu.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
