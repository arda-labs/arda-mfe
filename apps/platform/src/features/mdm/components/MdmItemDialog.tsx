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
import { notify } from "@workspace/ui/feedback/notify"
import { mdmApi, type MdmCatalogKey, type MdmItem } from "../../api"

type MdmItemForm = {
  code: string
  name: string
  description: string
  attributes: string
}

const emptyForm: MdmItemForm = { code: "", name: "", description: "", attributes: "" }

/** Create/edit dialog for one master-data record (tenant-scoped rows only). */
export function MdmItemDialog({
  open,
  onOpenChange,
  catalog,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  catalog: MdmCatalogKey
  editing: MdmItem | null
  onSaved: () => Promise<void>
}) {
  const { t } = useI18n()
  const [form, setForm] = useState<MdmItemForm>(emptyForm)
  const [savePending, setSavePending] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        code: editing.code,
        name: editing.name,
        description: editing.description ?? "",
        attributes: editing.attributes
          ? JSON.stringify(editing.attributes, null, 2)
          : "",
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
    let attributes: Record<string, unknown> | undefined
    if (form.attributes.trim()) {
      try {
        attributes = JSON.parse(form.attributes)
      } catch {
        notify.error(t("mdm.validation.attributes_json"))
        return
      }
    }
    setSavePending(true)
    try {
      const body = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        attributes,
      }
      if (editing) {
        await mdmApi.updateItem(catalog, editing.id, body)
      } else {
        await mdmApi.createItem(catalog, body)
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
            {editing ? t("mdm.edit") : t("mdm.create")}
          </DialogTitle>
          <DialogDescription>{t("mdm.dialog_description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="mdm-code">{t("mdm.field.code")}</Label>
            <Input
              id="mdm-code"
              value={form.code}
              disabled={Boolean(editing)}
              onChange={(event) =>
                setForm((current) => ({ ...current, code: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mdm-name">{t("mdm.field.name")}</Label>
            <Input
              id="mdm-name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mdm-description">{t("mdm.field.description")}</Label>
            <Input
              id="mdm-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mdm-attributes">{t("mdm.field.attributes")}</Label>
            <Textarea
              id="mdm-attributes"
              rows={4}
              placeholder='{"symbol":"₫","decimal_places":0}'
              value={form.attributes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  attributes: event.target.value,
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
