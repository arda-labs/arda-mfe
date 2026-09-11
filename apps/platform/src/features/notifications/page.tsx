import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  deleteNotificationTemplate,
  listNotificationSenders,
  listNotificationTemplates,
  upsertNotificationSender,
  upsertNotificationTemplate,
  type NotificationSender,
  type NotificationTemplate,
} from "../api"
import { DlqTab } from "./components/dlq-tab"
import { EventsTab } from "./components/events-tab"

type TabKey = "templates" | "senders" | "events" | "dlq"

/** Notification templates + mail sender config (X2). */
export function NotificationsAdminPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<TabKey>("templates")
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [senders, setSenders] = useState<NotificationSender[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const [eventCode, setEventCode] = useState("")
  const [channel, setChannel] = useState("email")
  const [locale, setLocale] = useState("vi-VN")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")

  const [host, setHost] = useState("")
  const [port, setPort] = useState("587")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [fromAddress, setFromAddress] = useState("")
  const [fromName, setFromName] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const [templateList, senderList] = await Promise.all([
        listNotificationTemplates(),
        listNotificationSenders(),
      ])
      setTemplates(templateList)
      setSenders(senderList)
    } catch {
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const saveTemplate = async () => {
    if (!eventCode.trim() || !body.trim()) {
      notify.error(t("platform.notifications.validation.required"))
      return
    }
    try {
      await upsertNotificationTemplate({
        event_code: eventCode.trim(),
        channel,
        locale,
        subject,
        body,
        is_active: true,
      })
      notify.success(t("platform.notifications.save_success"))
      setEventCode("")
      setSubject("")
      setBody("")
      await load()
    } catch {
      notify.error(t("platform.notifications.save_failed"))
    }
  }

  const saveSender = async () => {
    if (!host.trim() || !fromAddress.trim()) {
      notify.error(t("platform.notifications.validation.required"))
      return
    }
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
    }
  }

  const removeTemplate = async (id: string) => {
    try {
      await deleteNotificationTemplate(id)
      await load()
    } catch {
      notify.error(t("platform.notifications.save_failed"))
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div>
        <h1 className="text-lg font-semibold">{t("platform.notifications.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("platform.notifications.description")}
        </p>
      </div>

      <div className="flex gap-2">
        {(["templates", "senders", "events", "dlq"] as TabKey[]).map((value) => (
          <button
            key={value}
            type="button"
            className={
              value === tab
                ? "rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                : "rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/60"
            }
            onClick={() => setTab(value)}
          >
            {t(`platform.notifications.tab.${value}`)}
          </button>
        ))}
      </div>

      {loadFailed && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {t("platform.notifications.load_failed")}
        </div>
      )}

      {tab === "templates" && (
        <>
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
            <div className="space-y-1.5">
              <Label>{t("platform.notifications.field.event_code")}</Label>
              <Input
                value={eventCode}
                className="font-mono"
                onChange={(e) => setEventCode(e.target.value.toLowerCase())}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("platform.notifications.field.channel")}</Label>
              <select
                className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                <option value="email">email</option>
                <option value="in_app">in_app</option>
                <option value="push">push</option>
                <option value="sms">sms</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("platform.notifications.field.locale")}</Label>
              <Input value={locale} onChange={(e) => setLocale(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("platform.notifications.field.subject")}</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="w-full space-y-1.5">
              <Label>{t("platform.notifications.field.body")}</Label>
              <textarea
                className="min-h-[90px] w-full rounded-md border border-input bg-background p-2 font-mono text-xs"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <Button onClick={() => void saveTemplate()}>
              {t("common.action.save")}
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t("platform.notifications.field.event_code")}</th>
                  <th className="px-3 py-2">{t("platform.notifications.field.channel")}</th>
                  <th className="px-3 py-2">{t("platform.notifications.field.locale")}</th>
                  <th className="px-3 py-2">{t("platform.notifications.field.subject")}</th>
                  <th className="px-3 py-2">{t("common.field.status")}</th>
                  <th className="px-3 py-2 text-right">{t("common.field.action")}</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                      {t("common.loading")}
                    </td>
                  </tr>
                )}
                {!loading && templates.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                      {t("platform.notifications.empty")}
                    </td>
                  </tr>
                )}
                {templates.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs font-semibold text-primary">
                      {row.event_code}
                    </td>
                    <td className="px-3 py-2">{row.channel}</td>
                    <td className="px-3 py-2">{row.locale}</td>
                    <td className="max-w-[320px] truncate px-3 py-2">{row.subject || "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant={row.is_active ? "default" : "outline"}>
                        {row.is_active
                          ? t("platform.working_hours.active")
                          : t("platform.working_hours.inactive")}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className="text-xs font-semibold text-destructive hover:underline"
                        onClick={() => void removeTemplate(row.id)}
                      >
                        {t("common.action.delete")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "senders" && (
        <>
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
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
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
            <Button onClick={() => void saveSender()}>
              {t("common.action.save")}
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t("platform.notifications.field.channel")}</th>
                  <th className="px-3 py-2">{t("platform.notifications.field.host")}</th>
                  <th className="px-3 py-2">{t("platform.notifications.field.port")}</th>
                  <th className="px-3 py-2">{t("platform.notifications.field.from_address")}</th>
                  <th className="px-3 py-2">{t("platform.notifications.field.password")}</th>
                  <th className="px-3 py-2">{t("common.field.status")}</th>
                </tr>
              </thead>
              <tbody>
                {!loading && senders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                      {t("platform.notifications.empty")}
                    </td>
                  </tr>
                )}
                {senders.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-2">{row.channel}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.host}</td>
                    <td className="px-3 py-2 tabular-nums">{row.port}</td>
                    <td className="px-3 py-2">{row.from_address}</td>
                    <td className="px-3 py-2">
                      {row.has_password
                        ? t("platform.notifications.password_set")
                        : t("platform.notifications.password_missing")}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={row.is_active ? "default" : "outline"}>
                        {row.is_active
                          ? t("platform.working_hours.active")
                          : t("platform.working_hours.inactive")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === "events" && <EventsTab />}

      {tab === "dlq" && <DlqTab />}
    </div>
  )
}
