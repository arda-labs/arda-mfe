import { getCanonicalList, postCanonical } from "@workspace/api"
import type { CobRunResult, JobDefinition, JobRun } from "./types"

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

export function runCob(businessDate: string) {
  return postCanonical<CobRunResult>(
    `/api/platform/eod/run?business_date=${encodeURIComponent(businessDate)}`,
    {}
  )
}

export function seedCob() {
  return postCanonical<{ seeded: boolean }>("/api/platform/eod/seed", {})
}
