import { getCanonicalList, postCanonical } from "@workspace/api"
import type { RunJobRequest, ScheduledJobRun } from "../scheduled-jobs/types"
import type { JobDefinition, JobRun } from "./types"

export function listJobs() {
  return getCanonicalList<JobDefinition>("/api/platform/jobs")
}

export function listJobRuns(
  params: { job_code?: string; limit?: number } = {}
) {
  const search = new URLSearchParams()
  if (params.job_code) search.set("job_code", params.job_code)
  if (params.limit !== undefined) search.set("limit", String(params.limit))
  const qs = search.toString()
  return getCanonicalList<JobRun>(
    `/api/platform/jobs/runs${qs ? `?${qs}` : ""}`
  )
}

/** Body for a manual EOD run; `business_date` is the only param the job accepts. */
export function cobRunRequest(businessDate: string): RunJobRequest {
  return { params: businessDate ? { business_date: businessDate } : {} }
}

/**
 * COB now goes through the scheduled-jobs engine: 202 + the created run
 * (scheduled_job_handler.go Run). The run is followed in the "scheduled" tab.
 */
export function runCob(businessDate: string) {
  return postCanonical<ScheduledJobRun>(
    "/api/platform/scheduled-jobs/eod/run",
    cobRunRequest(businessDate)
  )
}

export function seedCob() {
  return postCanonical<{ seeded: boolean }>("/api/platform/eod/seed", {})
}
