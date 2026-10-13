export const JOBS_TAB_KEYS = ["scheduled", "eod"] as const

export type JobsTabKey = (typeof JOBS_TAB_KEYS)[number]

/**
 * `?tab=` picks the tab; `?run=<id>` (notification deep link, see
 * arda-be scheduled_run_repo.go `Href`) always belongs to the scheduled tab
 * because only its drawer can show a run.
 */
/** Deep link into the "scheduled" tab with the run drawer open (same shape as the BE `href`). */
export function scheduledRunHref(runId: string): string {
  const search = new URLSearchParams({ tab: "scheduled", run: runId })
  return `/admin/jobs?${search.toString()}`
}

export function parseJobsTab(tab: string | null, runId: string | null): JobsTabKey {
  if (runId) return "scheduled"
  return JOBS_TAB_KEYS.some((key) => key === tab) ? (tab as JobsTabKey) : "scheduled"
}
