import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { api, type ApiSuccess } from "@workspace/api"
import { useI18n } from "@workspace/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import type { CaseTimelineEvent } from "./types"

/**
 * "Lưu vết tác vụ" tab (EPAS `lib-task-activity-log`): the case timeline split
 * into the two EPAS blocks — "Danh sách ý kiến" (events carrying a note, i.e.
 * review/return reasons) and "Danh sách lưu vết" (the full lifecycle trace:
 * claim/submit/approve/reject events with actor + timestamp).
 *
 * Data source: GET /api/workflow/cases/{id}/timeline (workflow-service
 * `case_timeline_events`, readable via the standard workflow-read policy).
 */
export function CaseActivityLogPanel({ caseId }: { caseId: string }) {
  const { t, formatDate } = useI18n()
  const [events, setEvents] = useState<CaseTimelineEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!caseId) return
      setLoading(true)
      setFailed(false)
      try {
        const response = await api.get<ApiSuccess<CaseTimelineEvent[]>>(
          `/api/workflow/cases/${encodeURIComponent(caseId)}/timeline`
        )
        if (!cancelled) setEvents(response.result ?? [])
      } catch {
        if (!cancelled) setFailed(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [caseId])

  function eventLabel(eventType: string) {
    const key = `case_tabs.activity.events.${eventType}`
    const translated = t(key)
    return translated === key ? eventType : translated
  }

  function statusLabel(event: CaseTimelineEvent) {
    const from = event.fromStatus?.trim()
    const to = event.toStatus?.trim()
    if (from && to) return `${from} → ${to}`
    return to || from || "—"
  }

  const comments = events.filter((event) => event.note?.trim())

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {t("case_tabs.activity.loading")}
      </div>
    )
  }

  if (failed) {
    return (
      <p className="py-10 text-center text-sm text-destructive">
        {t("case_tabs.activity.load_error")}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            {t("case_tabs.activity.traces_title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("case_tabs.activity.empty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("case_tabs.activity.col_task")}</TableHead>
                  <TableHead className="w-56">
                    {t("case_tabs.activity.col_status")}
                  </TableHead>
                  <TableHead className="w-48">
                    {t("case_tabs.activity.col_time")}
                  </TableHead>
                  <TableHead className="w-56">
                    {t("case_tabs.activity.col_actor")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      {eventLabel(event.eventType)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {statusLabel(event)}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatDate(event.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-0 truncate text-muted-foreground">
                      {event.actor || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            {t("case_tabs.activity.comments_title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {comments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("case_tabs.activity.comments_empty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("case_tabs.activity.col_content")}</TableHead>
                  <TableHead className="w-48">
                    {t("case_tabs.activity.col_time")}
                  </TableHead>
                  <TableHead className="w-56">
                    {t("case_tabs.activity.col_actor")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comments.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="whitespace-normal">
                      {event.note}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatDate(event.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-0 truncate text-muted-foreground">
                      {event.actor || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
