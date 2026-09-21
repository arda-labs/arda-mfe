import { useCallback, useEffect, useState } from "react"
import { Pencil } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { notify } from "@workspace/ui/feedback/notify"
import {
  listNotificationSenders,
  upsertNotificationSender,
} from "../api"
import { type NotificationSender } from "../types"

const emptyForm = {
  host: "",
  port: "587",
  username: "",
  password: "",
  fromAddress: "",
  fromName: "",
  isActive: true,
}

/** Mail sender (SMTP) configuration tab: current config + create/edit form. */
export function SendersTab() {
  const { t } = useI18n()
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<NotificationSender | null>(null)
  const [pending, setPending] = useState(false)
  const [items, setItems] = useState<NotificationSender[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setItems(await listNotificationSenders())
    } catch (reason) {
      setLoadError(reason)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const startEdit = (row: NotificationSender) => {
    setEditing(row)
    setForm({
      host: row.host,
      port: String(row.port),
      username: row.username ?? "",
      password: "",
      fromAddress: row.from_address,
      fromName: row.from_name ?? "",
      isActive: row.is_active,
    })
  }

  const resetForm = () => {
    setEditing(null)
    setForm(emptyForm)
  }

  const save = async () => {
    if (!form.host.trim() || !form.fromAddress.trim()) {
      notify.error(t("platform.notifications.validation.required"))
      return
    }
    setPending(true)
    try {
      await upsertNotificationSender({
        channel: "email",
        host: form.host.trim(),
        port: Number(form.port) || 587,
        username: form.username.trim() || undefined,
        // Blank password keeps the stored one (server keeps password_enc).
        password: form.password || undefined,
        from_address: form.fromAddress.trim(),
        from_name: form.fromName.trim() || undefined,
        use_tls: true,
        is_active: form.isActive,
      })
      notify.success(t("platform.notifications.save_success"))
      resetForm()
      await load()
    } catch {
      notify.error(t("platform.notifications.save_failed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
        <div className="w-full">
          <p className="text-sm font-medium">
            {editing
              ? t("platform.notifications.sender.edit_title")
              : t("platform.notifications.sender.create_title")}
          </p>
          {editing ? (
            <p className="text-xs text-muted-foreground">
              {t("platform.notifications.sender.keep_password")}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label>{t("platform.notifications.field.host")}</Label>
          <Input
            value={form.host}
            onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("platform.notifications.field.port")}</Label>
          <Input
            inputMode="numeric"
            value={form.port}
            onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("platform.notifications.field.username")}</Label>
          <Input
            value={form.username}
            onChange={(e) =>
              setForm((f) => ({ ...f, username: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("platform.notifications.field.password")}</Label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("platform.notifications.field.from_address")}</Label>
          <Input
            value={form.fromAddress}
            onChange={(e) =>
              setForm((f) => ({ ...f, fromAddress: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("platform.notifications.field.from_name")}</Label>
          <Input
            value={form.fromName}
            onChange={(e) =>
              setForm((f) => ({ ...f, fromName: e.target.value }))
            }
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <Checkbox
            checked={form.isActive}
            onCheckedChange={(checked) =>
              setForm((f) => ({ ...f, isActive: checked === true }))
            }
          />
          {t("platform.working_hours.active")}
        </label>
        <Button onClick={() => void save()} disabled={pending}>
          {t("common.action.save")}
        </Button>
        {editing ? (
          <Button variant="outline" onClick={resetForm} disabled={pending}>
            {t("common.action.cancel")}
          </Button>
        ) : null}
      </div>

      {loadError ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <span>{t("platform.notifications.load_failed")}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            {t("common.action.retry")}
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>{t("platform.notifications.field.channel")}</TableHead>
              <TableHead>{t("platform.notifications.field.host")}</TableHead>
              <TableHead>{t("platform.notifications.field.port")}</TableHead>
              <TableHead>
                {t("platform.notifications.field.from_address")}
              </TableHead>
              <TableHead>{t("platform.notifications.field.password")}</TableHead>
              <TableHead>{t("common.field.status")}</TableHead>
              <TableHead className="text-right">
                {t("common.field.action")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-4 text-center text-muted-foreground"
                >
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : null}
            {!loading && items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-4 text-center text-muted-foreground"
                >
                  {t("platform.notifications.empty")}
                </TableCell>
              </TableRow>
            ) : null}
            {items.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.channel}</TableCell>
                <TableCell className="font-mono text-xs">{row.host}</TableCell>
                <TableCell className="tabular-nums">{row.port}</TableCell>
                <TableCell>{row.from_address}</TableCell>
                <TableCell>
                  {row.has_password
                    ? t("platform.notifications.password_set")
                    : t("platform.notifications.password_missing")}
                </TableCell>
                <TableCell>
                  <Badge variant={row.is_active ? "default" : "outline"}>
                    {row.is_active
                      ? t("platform.working_hours.active")
                      : t("platform.working_hours.inactive")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground"
                    title={t("common.action.edit")}
                    onClick={() => startEdit(row)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
