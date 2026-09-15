import { request } from "./internal"

/** Workflow analytics summary (W6 dashboard). */
export interface WorkflowAnalytics {
  cases_total: number
  by_status: Record<string, number>
  by_case_type: Record<string, number>
  open_tasks: number
  overdue_tasks: number
}

export function getWorkflowAnalytics(
  params: { from?: string; to?: string } = {}
) {
  const search = new URLSearchParams()
  if (params.from) search.set("from", params.from)
  if (params.to) search.set("to", params.to)
  const qs = search.toString()
  return request<WorkflowAnalytics>(
    `/api/workflow/analytics/overview${qs ? `?${qs}` : ""}`
  )
}

export function workItemsExportUrl(params: { direction?: string } = {}) {
  const search = new URLSearchParams()
  if (params.direction) search.set("direction", params.direction)
  const qs = search.toString()
  return `/api/workflow/work-items/export${qs ? `?${qs}` : ""}`
}
