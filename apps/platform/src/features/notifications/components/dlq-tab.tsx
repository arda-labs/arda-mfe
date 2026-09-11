import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { formatDateShort } from "@workspace/format"
import {
  discardNotificationDLQ,
  listNotificationDLQ,
  retryNotificationDLQ,
  type NotificationDLQEntry,
} from "../../api"

/** Dead-letter queue — inspect, replay or discard failed outbox events. */
export function DlqTab() {
  const { t } = useI18n()
  const [items, setItems] = useState<NotificationDLQEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")

  const load = useCallback(async () => {
    try {
      setItems(await listNotificationDLQ())
    } catch {
      // keep empty state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const retry = async (id: string) => {
    setBusyId(id)
    try {
      await retryNotificationDLQ(id)
      notify.success(t("platform.notifications.dlq.retry_success"))
      await load()
    } catch (err) {
      notify.error(
        t("platform.notifications.dlq.retry_failed"),
        err instanceof Error ? err.message : String(err)
      )
    } finally {
      setBusyId("")
    }
  }

  const discard = async (id: string) => {
    setBusyId(id)
    try {
      await discardNotificationDLQ(id)
      notify.success(t("platform.notifications.dlq.discard_success"))
      await load()
    } catch (err) {
      notify.error(
        t("platform.notifications.dlq.discard_failed"),
        err instanceof Error ? err.message : String(err)
      )
    } finally {
      setBusyId("")
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2">{t("platform.notifications.event.code")}</th>
            <th className="px-3 py-2">{t("platform.notifications.dlq.subject")}</th>
            <th className="px-3 py-2">{t("platform.notifications.dlq.attempts")}</th>
            <th className="px-3 py-2">{t("platform.notifications.dlq.last_error")}</th>
            <th className="px-3 py-2">{t("platform.notifications.dlq.dead_at")}</th>
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
          {!loading && items.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                {t("platform.notifications.dlq.empty")}
              </td>
            </tr>
          )}
          {items.map((row) => (
            <tr key={row.outbox_id} className="border-t border-border">
              <td className="px-3 py-2 font-mono text-xs font-semibold text-primary">
                {row.event_code || "—"}
              </td>
              <td className="px-3 py-2 font-mono text-xs">{row.subject}</td>
              <td className="px-3 py-2 tabular-nums">{row.attempts}</td>
              <td className="max-w-[280px] truncate px-3 py-2 text-destructive">
                {row.last_error || "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                {formatDateShort(row.dead_lettered_at)}
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    disabled={busyId === row.outbox_id}
                    onClick={() => void retry(row.outbox_id)}
                  >
                    {t("platform.notifications.dlq.btn.retry")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] text-destructive"
                    disabled={busyId === row.outbox_id}
                    onClick={() => void discard(row.outbox_id)}
                  >
                    {t("platform.notifications.dlq.btn.discard")}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
