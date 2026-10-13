import { useEffect, useState } from "react"
import { api, type ApiSuccess } from "@workspace/api"
import type { CaseTimelineEvent } from "./types"

/**
 * GET /api/workflow/cases/{id}/timeline (workflow-service
 * case_timeline_events, workflow-read policy). Shared by the activity log
 * tab and the approval trail.
 */
export function useCaseTimeline(caseId: string | undefined) {
  const [events, setEvents] = useState<CaseTimelineEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!caseId) {
      setEvents([])
      return
    }
    let cancelled = false
    setLoading(true)
    setFailed(false)
    api
      .get<ApiSuccess<CaseTimelineEvent[]>>(
        `/api/workflow/cases/${encodeURIComponent(caseId)}/timeline`
      )
      .then((response) => {
        if (!cancelled) setEvents(response.result ?? [])
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [caseId])

  return { events, loading, failed }
}
