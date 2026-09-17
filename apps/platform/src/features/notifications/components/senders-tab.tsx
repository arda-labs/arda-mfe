import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
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

/** Mail sender (SMTP) configuration tab. */
export function SendersTab() {
  const { t } = useI18n()
  const [host, setHost] = useState("")
  const [port, setPort] = useState("587")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [fromAddress, setFromAddress] = useState("")
  const [fromName, setFromName] = useState("")
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

  const save = async () => {
    if (!host.trim() || !fromAddress.trim()) {
      notify.error(t("platform.notifications.validation.required"))
      return
    }
    setPending(true)
    try {
      await upsertNotificationSender({
        channel: "email",
        host: host.trim(),
        port: Number(port) || 587,
        username: username.trim() || undefined,
        password: password || undefined,
        from_address: fromAddress.trim(),
        from_name: fromName.trim() || undefined,
        use_tls: true,
        is_active: true,
      })
      notify.success(t("platform.notifications.save_success"))
      setPassword("")
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
        <div className="space-y-1.5">
          <Label>{t("platform.notifications.field.host")}</Label>
          <Input value={host} onChange={(e) => setHost(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("platform.notifications.field.port")}</Label>
          <Input
            inputMode="numeric"
            value={port}
            onChange={(e) => setPort(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("platform.notifications.field.username")}</Label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("platform.notifications.field.password")}</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("platform.notifications.field.from_address")}</Label>
          <Input
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("platform.notifications.field.from_name")}</Label>
          <Input value={fromName} onChange={(e) => setFromName(e.target.value)} />
        </div>
        <Button onClick={() => void save()} disabled={pending}>
          {t("common.action.save")}
        </Button>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-4 text-center text-muted-foreground"
                >
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : null}
            {!loading && items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
