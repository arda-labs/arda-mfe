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
import { upsertNotificationTemplate } from "../api"
import { type NotificationTemplate } from "../types"

const CHANNELS = ["email", "in_app", "push", "sms"]
const emptyForm = {
  event_code: "",
  channel: "email",
  locale: "vi-VN",
  subject: "",
  design_code: "",
  body: "",
  body_html: "",
  is_active: true,
}

/** Create/edit one notification template. */
export function TemplateDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: NotificationTemplate | null
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
            event_code: editing.event_code,
            channel: editing.channel,
            locale: editing.locale,
            subject: editing.subject,
            design_code: editing.design_code ?? "",
            body: editing.body,
            body_html: editing.body_html ?? "",
            is_active: editing.is_active,
          }
        : emptyForm
    )
  }, [open, editing])

  const save = async () => {
    if (!form.event_code.trim() || (!form.body.trim() && !form.body_html.trim())) {
      notify.error(t("platform.notifications.validation.required"))
      return
    }
    setSaving(true)
    try {
      await upsertNotificationTemplate({
        event_code: form.event_code.trim(),
        channel: form.channel,
        locale: form.locale.trim() || "vi-VN",
        subject: form.subject,
        design_code: form.design_code.trim(),
        body: form.body,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? t("platform.notifications.template.edit_title")
              : t("platform.notifications.template.create_title")}
          </DialogTitle>
          <DialogDescription>
            {t("platform.notifications.template.dialog_description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{t("platform.notifications.field.event_code")}</Label>
              <Input
                className="font-mono"
                value={form.event_code}
                disabled={Boolean(editing)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    event_code: e.target.value.toLowerCase(),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("platform.notifications.field.channel")}</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.channel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, channel: e.target.value }))
                }
              >
                {CHANNELS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("platform.notifications.field.locale")}</Label>
              <Input
                value={form.locale}
                onChange={(e) =>
                  setForm((f) => ({ ...f, locale: e.target.value }))
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
            <Label>{t("platform.notifications.field.design_code")}</Label>
            <Input
              className="font-mono"
              value={form.design_code}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  design_code: e.target.value.toLowerCase(),
                }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("platform.notifications.field.body")}</Label>
            <Textarea
              className="min-h-[80px] font-mono text-xs"
              value={form.body}
              onChange={(e) =>
                setForm((f) => ({ ...f, body: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("platform.notifications.field.body_html")}</Label>
            <Textarea
              className="min-h-[140px] font-mono text-xs"
              value={form.body_html}
              placeholder="<html>…"
              onChange={(e) =>
                setForm((f) => ({ ...f, body_html: e.target.value }))
              }
            />
          </div>

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
