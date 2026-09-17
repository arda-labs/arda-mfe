import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { listNotificationEvents } from "../api"
import { type NotificationEvent } from "../types"

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
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>{t("platform.notifications.event.code")}</TableHead>
            <TableHead>{t("platform.notifications.event.subject")}</TableHead>
            <TableHead>{t("platform.notifications.event.domain")}</TableHead>
            <TableHead>{t("platform.notifications.event.description")}</TableHead>
            <TableHead>
              {t("platform.notifications.event.has_template")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-4 text-center text-muted-foreground"
              >
                {t("common.loading")}
              </TableCell>
            </TableRow>
          ) : null}
          {!loading && items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-4 text-center text-muted-foreground"
              >
                {t("platform.notifications.empty")}
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((row) => (
            <TableRow key={row.code}>
              <TableCell className="font-mono text-xs font-semibold text-primary">
                {row.code}
              </TableCell>
              <TableCell className="font-mono text-xs">{row.subject}</TableCell>
              <TableCell>
                <Badge variant="outline">{row.domain}</Badge>
              </TableCell>
              <TableCell>{row.description}</TableCell>
              <TableCell>
                <Badge variant={row.has_template ? "default" : "secondary"}>
                  {row.has_template
                    ? t("platform.notifications.event.configured")
                    : t("platform.notifications.event.missing")}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
