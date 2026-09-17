import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { notify } from "@workspace/ui/feedback/notify"
import { formatDateShort } from "@workspace/format"
import { discardNotificationDLQ, listNotificationDLQ, retryNotificationDLQ } from "../api"
import { type NotificationDLQEntry } from "../types"

/**
 * Dead-letter queue — inspect, replay or discard failed outbox events.
 * TODO(BE): `GET /api/notifications/dlq` has no page/perPage contract — it
 * returns at most `limit` rows (default 100). Add server paging here once the
 * endpoint supports it; do not fake paging client-side.
 */
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
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>{t("platform.notifications.event.code")}</TableHead>
            <TableHead>{t("platform.notifications.dlq.subject")}</TableHead>
            <TableHead>{t("platform.notifications.dlq.attempts")}</TableHead>
            <TableHead>{t("platform.notifications.dlq.last_error")}</TableHead>
            <TableHead>{t("platform.notifications.dlq.dead_at")}</TableHead>
            <TableHead className="text-right">
              {t("common.field.action")}
            </TableHead>
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
                {t("platform.notifications.dlq.empty")}
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((row) => (
            <TableRow key={row.outbox_id}>
              <TableCell className="font-mono text-xs font-semibold text-primary">
                {row.event_code || "—"}
              </TableCell>
              <TableCell className="font-mono text-xs">{row.subject}</TableCell>
              <TableCell className="tabular-nums">{row.attempts}</TableCell>
              <TableCell className="max-w-[280px] truncate text-destructive">
                {row.last_error || "—"}
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {formatDateShort(row.dead_lettered_at)}
              </TableCell>
              <TableCell className="text-right">
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
