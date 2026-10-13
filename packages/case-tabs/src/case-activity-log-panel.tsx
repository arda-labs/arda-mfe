import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { ActivityLog, type ActivityTone } from "@workspace/ui/components/activity-log"
import { SegmentedControl } from "@workspace/ui/components/segmented-control"
import type { CaseTimelineEvent } from "./types"
import { useCaseTimeline } from "./use-case-timeline"

const EVENT_TONE: Record<string, ActivityTone> = {
  CASE_SUBMITTED: "info",
  CHECKER_APPROVED: "success",
  TASK_COMPLETED: "success",
  CHECKER_REQUEST_CHANGES: "warning",
  CHECKER_REJECTED: "danger",
  JOB_FAILED: "danger",
}

type View = "all" | "comments"

/**
 * "Lưu vết tác vụ" tab (EPAS `lib-task-activity-log`): the case timeline as
 * one activity feed. EPAS splits it into "Danh sách lưu vết" and "Danh
 * sách ý kiến"; here the second is a filter of the first (events carrying
 * a note — review and return reasons).
 *
 * Data source: GET /api/workflow/cases/{id}/timeline (workflow-service
 * `case_timeline_events`, readable via the standard workflow-read policy).
 */
export function CaseActivityLogPanel({ caseId }: { caseId: string }) {
  const { t } = useI18n()
  const { events, loading, failed } = useCaseTimeline(caseId)
  const [view, setView] = useState<View>("all")

  function eventLabel(eventType: string) {
    const key = `case_tabs.activity.events.${eventType}`
    const translated = t(key)
    return translated === key ? eventType : translated
  }

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

  const comments = events.filter((event) => event.note?.trim())
  const shown: CaseTimelineEvent[] = view === "comments" ? comments : events

  return (
    <div className="max-w-3xl space-y-4">
      <SegmentedControl<View>
        size="sm"
        value={view}
        onValueChange={setView}
        aria-label={t("case_tabs.activity.title")}
        options={[
          { value: "all", label: `${t("case_tabs.activity.traces_title")} · ${events.length}` },
          { value: "comments", label: `${t("case_tabs.activity.comments_title")} · ${comments.length}` },
        ]}
      />
      <ActivityLog
        emptyText={t(view === "comments" ? "case_tabs.activity.comments_empty" : "case_tabs.activity.empty")}
        items={shown.map((event) => ({
          id: event.id,
          actor: event.actor,
          action: eventLabel(event.eventType),
          at: event.createdAt,
          from: event.fromStatus?.trim() || undefined,
          to: event.toStatus?.trim() || undefined,
          note: event.note?.trim() || undefined,
          tone: EVENT_TONE[event.eventType] ?? "neutral",
        }))}
      />
    </div>
  )
}
