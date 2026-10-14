import type { CaseTimelineEvent } from "@workspace/case-tabs/types"

/**
 * Change requests the approval trail no longer shows, newest first. The trail
 * keeps only the latest return reason on a returned maker step and clears it
 * once the maker resubmits, so the earlier ones would otherwise be hidden in
 * the activity log.
 */
export function earlierChangeRequests(
  events: CaseTimelineEvent[],
  makerReturned: boolean
): CaseTimelineEvent[] {
  const requests = events
    .filter((event) => event.eventType === "CHECKER_REQUEST_CHANGES")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
  return makerReturned ? requests.slice(1) : requests
}
