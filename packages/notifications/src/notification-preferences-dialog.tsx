import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { notificationsApi } from "./api"
import type { NotificationPreference } from "./types"

const channels: NotificationPreference["channel"][] = [
  "in_app",
  "push",
  "email",
  "sms",
]
const knownEventGroups = [
  "workflow.task",
  "workflow.case",
  "loan.disbursement",
  "crm.customer",
  "statistical.indicator",
]

function completePreferences(items: NotificationPreference[]) {
  const locale = navigator.language.toLowerCase().startsWith("vi")
    ? "vi-VN"
    : "en-US"
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  const groups = [
    ...new Set([...knownEventGroups, ...items.map((item) => item.eventGroup)]),
  ]
  const existing = new Map(
    items.map((item) => [`${item.eventGroup}:${item.channel}`, item])
  )
  return groups.flatMap((eventGroup) =>
    channels.map(
      (channel) =>
        existing.get(`${eventGroup}:${channel}`) ?? {
          eventGroup,
          channel,
          enabled: channel === "in_app",
          quietStart: null,
          quietEnd: null,
          timezone,
          digestMode: "NONE" as const,
          locale,
        }
    )
  )
}

export function NotificationPreferencesDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useI18n()
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    notificationsApi
      .preferences()
      .then((items) => {
        if (active) setPreferences(completePreferences(items))
      })
      .catch((error) =>
        notify.apiError(t("notifications.preferences.load_failed"), error)
      )
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, t])

  const update = (index: number, patch: Partial<NotificationPreference>) => {
    setPreferences((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    )
  }

  const save = async () => {
    setSaving(true)
    try {
      await Promise.all(preferences.map(notificationsApi.savePreference))
      notify.saveSuccess(t("notifications.preferences.saved"))
      onOpenChange(false)
    } catch (error) {
      notify.apiError(t("notifications.preferences.save_failed"), error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("notifications.preferences.title")}</DialogTitle>
          <DialogDescription>
            {t("notifications.preferences.description")}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="py-6 text-sm text-muted-foreground">
            {t("notifications.preferences.loading")}
          </p>
        ) : preferences.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            {t("notifications.preferences.empty")}
          </p>
        ) : (
          <div className="space-y-3">
            {preferences.map((preference, index) => (
              <section
                key={`${preference.eventGroup}:${preference.channel}`}
                className="rounded-md border p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {t(
                        `notifications.preferences.groups.${preference.eventGroup}`
                      )}
                    </p>
                    <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={preference.enabled}
                        onChange={(event) =>
                          update(index, { enabled: event.target.checked })
                        }
                      />
                      {t("notifications.preferences.enabled")}
                    </label>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t(
                      `notifications.preferences.channels.${preference.channel}`
                    )}
                  </span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs">
                    <span className="block text-muted-foreground">
                      {t("notifications.preferences.quiet_start")}
                    </span>
                    <input
                      type="time"
                      className="h-8 w-full rounded-md border bg-background px-2"
                      value={preference.quietStart ?? ""}
                      onChange={(event) =>
                        update(index, {
                          quietStart: event.target.value || null,
                        })
                      }
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="block text-muted-foreground">
                      {t("notifications.preferences.locale")}
                    </span>
                    <select
                      className="h-8 w-full rounded-md border bg-background px-2"
                      value={preference.locale}
                      onChange={(event) =>
                        update(index, { locale: event.target.value })
                      }
                    >
                      <option value="vi-VN">
                        {t("notifications.preferences.locales.vi")}
                      </option>
                      <option value="en-US">
                        {t("notifications.preferences.locales.en")}
                      </option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="block text-muted-foreground">
                      {t("notifications.preferences.quiet_end")}
                    </span>
                    <input
                      type="time"
                      className="h-8 w-full rounded-md border bg-background px-2"
                      value={preference.quietEnd ?? ""}
                      onChange={(event) =>
                        update(index, { quietEnd: event.target.value || null })
                      }
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="block text-muted-foreground">
                      {t("notifications.preferences.digest")}
                    </span>
                    <select
                      className="h-8 w-full rounded-md border bg-background px-2"
                      value={preference.digestMode}
                      onChange={(event) =>
                        update(index, {
                          digestMode: event.target
                            .value as NotificationPreference["digestMode"],
                        })
                      }
                    >
                      {(["NONE", "HOURLY", "DAILY"] as const).map((mode) => (
                        <option key={mode} value={mode}>
                          {t(
                            `notifications.preferences.digests.${mode.toLowerCase()}`
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="block text-muted-foreground">
                      {t("notifications.preferences.timezone")}
                    </span>
                    <input
                      className="h-8 w-full rounded-md border bg-background px-2"
                      value={preference.timezone}
                      onChange={(event) =>
                        update(index, { timezone: event.target.value })
                      }
                    />
                  </label>
                </div>
              </section>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("notifications.preferences.cancel")}
          </Button>
          <Button
            onClick={() => void save()}
            disabled={loading || saving || preferences.length === 0}
          >
            {saving
              ? t("notifications.preferences.saving")
              : t("notifications.preferences.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
