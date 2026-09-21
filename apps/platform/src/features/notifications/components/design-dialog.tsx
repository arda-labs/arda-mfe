import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
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
import { upsertEmailDesign } from "../api"
import { type EmailDesign } from "../types"

const emptyForm = {
  code: "",
  name: "",
  subject: "",
  body_html: "",
  is_active: true,
}

/** Create/edit one reusable email design, with an HTML preview. */
export function DesignDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: EmailDesign | null
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(
      editing
        ? {
            code: editing.code,
            name: editing.name,
            subject: editing.subject,
            body_html: editing.body_html,
            is_active: editing.is_active,
          }
        : emptyForm
    )
  }, [open, editing])

  const save = async () => {
    if (!form.code.trim() || !form.body_html.trim()) {
      notify.error(t("platform.notifications.validation.required"))
      return
    }
    setSaving(true)
    try {
      await upsertEmailDesign({
        code: form.code.trim(),
        name: form.name.trim(),
        subject: form.subject.trim(),
        body_html: form.body_html,
        is_active: form.is_active,
      })
      notify.success(t("platform.notifications.save_success"))
      onOpenChange(false)
      await onSaved()
    } catch {
      notify.error(t("platform.notifications.save_failed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? t("platform.notifications.design.edit_title")
              : t("platform.notifications.design.create_title")}
          </DialogTitle>
          <DialogDescription>
            {t("platform.notifications.design.dialog_description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("platform.notifications.field.code")}</Label>
              <Input
                className="font-mono"
                value={form.code}
                disabled={Boolean(editing)}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toLowerCase() }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("platform.notifications.field.name")}</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("platform.notifications.field.subject")}</Label>
            <Input
              value={form.subject}
              onChange={(e) =>
                setForm((f) => ({ ...f, subject: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("platform.notifications.field.body_html")}</Label>
            <Textarea
              className="min-h-[180px] font-mono text-xs"
              value={form.body_html}
              placeholder="<html>…"
              onChange={(e) =>
                setForm((f) => ({ ...f, body_html: e.target.value }))
              }
            />
          </div>

          {form.body_html.trim() ? (
            <div className="space-y-1.5">
              <Label>{t("platform.notifications.design.preview")}</Label>
              <iframe
                title={t("platform.notifications.design.preview")}
                sandbox=""
                className="h-56 w-full rounded-md border border-border bg-white"
                srcDoc={form.body_html}
              />
            </div>
          ) : null}

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.is_active}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, is_active: checked === true }))
              }
            />
            {t("platform.working_hours.active")}
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            {t("common.action.cancel")}
          </Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {t("common.action.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
