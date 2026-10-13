import { api, getCanonical, getCanonicalList, postCanonical } from "@workspace/api"
import type { ApiSuccess } from "@workspace/api"
import { runsSearch } from "./format"
import type {
  CronPreviewRequest,
  CronPreviewResult,
  JobConfigUpdate,
  JobStatus,
  RunJobRequest,
  RunsPage,
  ScheduledJob,
  ScheduledJobRun,
} from "./types"

const BASE = "/api/platform/scheduled-jobs"

const jobPath = (code: string) => `${BASE}/${encodeURIComponent(code)}`

/** Pure URL builder — unit-tested in apps/platform/tests/scheduled-jobs.test.tsx. */
export function runsPath(code: string, page: number, status?: JobStatus | ""): string {
  return `${jobPath(code)}/runs?${runsSearch(page, status).toString()}`
}

export const scheduledJobsApi = {
  list: () => getCanonicalList<ScheduledJob>(BASE),
  get: (code: string) => getCanonical<ScheduledJob>(jobPath(code)),
  /** PATCH with the full operational config; 409 `platform.jobs.version_conflict` on stale `version`. */
  update: async (code: string, body: JobConfigUpdate) => {
    const response = await api.patch<ApiSuccess<ScheduledJob>>(jobPath(code), body)
    return response.result
  },
  /** 202 with the created run; 409 `platform.jobs.already_running` while a run is open. */
  run: (code: string, params?: Record<string, string>) => {
    const body: RunJobRequest = { params: params ?? {} }
    return postCanonical<ScheduledJobRun>(`${jobPath(code)}/run`, body)
  },
  preview: (cron_expr: string, timezone: string) => {
    const body: CronPreviewRequest = { cron_expr, timezone }
    return postCanonical<CronPreviewResult>(`${BASE}/cron-preview`, body)
  },
  listRuns: (code: string, page: number, status?: JobStatus | "") =>
    getCanonical<RunsPage>(runsPath(code, page, status)),
  getRun: (id: string) => getCanonical<ScheduledJobRun>(`${BASE}/runs/${encodeURIComponent(id)}`),
}
