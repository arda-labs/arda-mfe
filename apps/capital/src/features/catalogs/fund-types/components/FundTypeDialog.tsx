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
import { capitalApi, type FundType } from "../../../api"

/** Create/edit one fund type (CFM catalog). */
export function FundTypeDialog({
  open,
  onOpenChange,
  fundType,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  fundType: FundType | null
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setCode(fundType?.code ?? "")
    setName(fundType?.name ?? "")
    setIsActive(fundType?.is_active ?? true)
  }, [fundType, open])

  const submit = async () => {
    if (!code.trim() || !name.trim()) {
      notify.error(t("capital.catalogs.validation.required"))
      return
    }
    setPending(true)
    try {
      if (fundType) {
        await capitalApi.updateFundType(fundType.id, { name: name.trim(), is_active: isActive })
      } else {
        await capitalApi.createFundType({ code: code.trim(), name: name.trim() })
      }
      notify.success(t("capital.catalogs.save_success"))
      onOpenChange(false)
      await onSaved()
    } catch {
      notify.error(t("capital.catalogs.save_failed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {fundType ? t("capital.fund_types.edit") : t("capital.fund_types.create")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t("common.field.code")}</Label>
            <Input
              value={code}
              disabled={Boolean(fundType)}
              className="font-mono"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("common.field.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {fundType && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              {t("capital.catalogs.is_active")}
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
