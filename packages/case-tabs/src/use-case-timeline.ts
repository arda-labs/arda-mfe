import { useQuery } from "@tanstack/react-query"
import { api, type ApiSuccess } from "@workspace/api"
import type { CaseTimelineEvent } from "./types"

const EMPTY: CaseTimelineEvent[] = []

/** Query key of one case's timeline; invalidate it after a case decision. */
export const caseTimelineKey = (caseId: string) => ["workflow", "case-timeline", caseId] as const

/**
 * GET /api/workflow/cases/{id}/timeline (workflow-service
 * case_timeline_events, workflow-read policy). Shared by the activity log
 * tab and the approval trail: one react-query entry per case, so every
 * component showing the same case reuses a single request.
 */
export function useCaseTimeline(caseId: string | undefined) {
  const query = useQuery({
    queryKey: caseTimelineKey(caseId ?? ""),
    queryFn: ({ signal }) =>
      api
        .get<ApiSuccess<CaseTimelineEvent[]>>(
          `/api/workflow/cases/${encodeURIComponent(caseId!)}/timeline`,
          { signal }
        )
        .then((response) => response.result ?? EMPTY),
    enabled: Boolean(caseId),
    staleTime: 5_000,
  })

  return {
    events: caseId ? (query.data ?? EMPTY) : EMPTY,
    loading: Boolean(caseId) && query.isPending,
    failed: query.isError,
  }
}
