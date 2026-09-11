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
import { counterpartyApi, type Counterparty } from "../../api"

/** Create/edit one counterparty (TK đối tác). */
export function CounterpartyDialog({
  open,
  onOpenChange,
  counterparty,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  counterparty: Counterparty | null
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [partyType, setPartyType] = useState("OTHER")
  const [orgCode, setOrgCode] = useState("")
  const [note, setNote] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setCode(counterparty?.code ?? "")
    setName(counterparty?.name ?? "")
    setPartyType(counterparty?.party_type ?? "OTHER")
    setOrgCode(counterparty?.org_code ?? "")
    setNote(counterparty?.note ?? "")
    setIsActive(counterparty?.is_active ?? true)
  }, [counterparty, open])

  const submit = async () => {
    if (!code.trim() || !name.trim()) {
      notify.error(t("finance.counterparties.validation.required"))
      return
    }
    setPending(true)
    try {
      if (counterparty) {
        await counterpartyApi.update(counterparty.id, {
          name: name.trim(),
          party_type: partyType,
          org_code: orgCode || undefined,
          note,
          is_active: isActive,
        })
      } else {
        await counterpartyApi.upsert({
          code: code.trim(),
          name: name.trim(),
          party_type: partyType,
          org_code: orgCode || undefined,
          note,
        })
      }
      notify.success(t("finance.counterparties.save_success"))
      onOpenChange(false)
      await onSaved()
    } catch {
      notify.error(t("finance.counterparties.save_failed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {counterparty ? t("finance.counterparties.edit") : t("finance.counterparties.create")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("common.field.code")}</Label>
            <Input
              value={code}
              disabled={Boolean(counterparty)}
              className="font-mono"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("common.field.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("finance.counterparties.field.party_type")}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={partyType}
              onChange={(e) => setPartyType(e.target.value)}
            >
              <option value="INTERNAL">INTERNAL</option>
              <option value="BANK">BANK</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("finance.counterparties.field.org")}</Label>
            <Input value={orgCode} onChange={(e) => setOrgCode(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>{t("finance.counterparties.field.note")}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {counterparty && (
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              {t("finance.counterparties.active")}
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.action.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={pending}>
            {t("common.action.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
