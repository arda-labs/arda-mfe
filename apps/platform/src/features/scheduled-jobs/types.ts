/**
 * Wire types for the scheduled-jobs admin API (`/api/platform/scheduled-jobs*`).
 * Platform has no OpenAPI document yet (plan 2026-10-11, deliberate deviation 3),
 * so every type states its Go source. Fields are snake_case (R9).
 */

/** Source: arda-be/apps/platform-service/internal/domain/scheduled_job.go:15-19 */
export type JobStatus = "RUNNING" | "SUCCEEDED" | "FAILED" | "TIMED_OUT" | "SKIPPED"

/** Source: arda-be/apps/platform-service/internal/domain/scheduled_job.go:21-22 */
export type JobTrigger = "SCHEDULE" | "MANUAL"

/** `last_status` only ever holds a terminal, non-skipped outcome. */
export type JobLastStatus = "SUCCEEDED" | "FAILED" | "TIMED_OUT"

/** Source: arda-be/apps/platform-service/internal/domain/scheduled_job.go:92-107 */
export interface ScheduledJobRun {
  id: string
  job_code: string
  trigger: JobTrigger
  scheduled_for: string
  status: JobStatus
  attempt: number
  started_at: string
  finished_at: string | null
  deadline_at: string
  error_code: string | null
  error_message: string | null
  /** Raw JSON reported by the job (`json.RawMessage`, omitted when empty). */
  result?: unknown
  triggered_by: string
  params?: Record<string, string>
}

/** Source: arda-be/apps/platform-service/internal/domain/scheduled_job.go:67-90 */
export interface ScheduledJob {
  code: string
  name: string
  owner_service: string
  path: string
  /** `null` (or empty) means the job only runs manually. */
  cron_expr: string | null
  timezone: string
  enabled: boolean
  timeout_seconds: number
  max_attempts: number
  retry_backoff_seconds: number
  notify_tenant_id: string
  notify_user_ids: string[] | null
  notify_group_ids: string[] | null
  notify_role_codes: string[] | null
  next_run_at: string | null
  last_status: JobLastStatus | null
  target_configured: boolean
  retired_at: string | null
  version: number
  updated_at: string
  updated_by: string | null
  last_run?: ScheduledJobRun
}

/**
 * Full operational config; the client always sends every field.
 * Source: arda-be/apps/platform-service/internal/domain/scheduled_job.go:111-122
 */
export interface JobConfigUpdate {
  cron_expr: string | null
  timezone: string
  enabled: boolean
  timeout_seconds: number
  max_attempts: number
  retry_backoff_seconds: number
  notify_user_ids: string[]
  notify_group_ids: string[]
  notify_role_codes: string[]
  version: number
}

/** Source: arda-be/apps/platform-service/internal/handler/scheduled_job_handler.go:176-192 (Preview) */
export interface CronPreviewRequest {
  cron_expr: string
  timezone: string
}

/** Source: arda-be/apps/platform-service/internal/handler/scheduled_job_handler.go:191 */
export interface CronPreviewResult {
  next_runs: string[]
}

/** Source: arda-be/apps/platform-service/internal/handler/scheduled_job_handler.go:153-174 (Run) */
export interface RunJobRequest {
  params: Record<string, string>
}

/**
 * Paged run history: `WriteEnvelopeList` → `{ items, page, per_page, total }`.
 * Source: arda-be/apps/platform-service/internal/handler/scheduled_job_handler.go:194-208 (ListRuns)
 */
export interface RunsPage {
  items: ScheduledJobRun[] | null
  page: number
  per_page: number
  total: number
}

/** Problem codes the UI reacts to. Source: arda-be/docs/problems/platform.jobs.*.md */
export const JOB_PROBLEM = {
  invalidSchedule: "platform.jobs.invalid_schedule",
  versionConflict: "platform.jobs.version_conflict",
  alreadyRunning: "platform.jobs.already_running",
  notFound: "platform.jobs.not_found",
  retired: "platform.jobs.retired",
  busy: "platform.jobs.busy",
  targetNotConfigured: "platform.jobs.target_not_configured",
  paramNotAllowed: "platform.jobs.param_not_allowed",
} as const

/** Value bounds enforced by `JobConfigUpdate.Validate` (scheduled_job.go:131-152). */
export const JOB_LIMITS = {
  timeoutSeconds: { min: 10, max: 3600 },
  maxAttempts: { min: 1, max: 5 },
  retryBackoffSeconds: { min: 0, max: 3600 },
  maxRecipients: 50,
} as const

/** View model: a result summary shaped like the ai-eval job report (optional). */
export interface EvalCase {
  id: string
  passed: boolean
  error?: string
  recall?: number
}
