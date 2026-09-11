import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { listNotificationEvents, type NotificationEvent } from "../../api"

/** Notification event registry — event codes accepted by the platform. */
export function EventsTab() {
  const { t } = useI18n()
  const [items, setItems] = useState<NotificationEvent[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setItems(await listNotificationEvents())
    } catch {
      // keep empty state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2">{t("platform.notifications.event.code")}</th>
            <th className="px-3 py-2">{t("platform.notifications.event.subject")}</th>
            <th className="px-3 py-2">{t("platform.notifications.event.domain")}</th>
            <th className="px-3 py-2">{t("platform.notifications.event.description")}</th>
            <th className="px-3 py-2">{t("platform.notifications.event.has_template")}</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                {t("common.loading")}
              </td>
            </tr>
          )}
          {!loading && items.length === 0 && (
            <tr>
              <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                {t("platform.notifications.empty")}
              </td>
            </tr>
          )}
          {items.map((row) => (
            <tr key={row.code} className="border-t border-border">
              <td className="px-3 py-2 font-mono text-xs font-semibold text-primary">
                {row.code}
              </td>
              <td className="px-3 py-2 font-mono text-xs">{row.subject}</td>
              <td className="px-3 py-2">
                <Badge variant="outline">{row.domain}</Badge>
              </td>
              <td className="px-3 py-2">{row.description}</td>
              <td className="px-3 py-2">
                <Badge variant={row.has_template ? "default" : "secondary"}>
                  {row.has_template
                    ? t("platform.notifications.event.configured")
                    : t("platform.notifications.event.missing")}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
