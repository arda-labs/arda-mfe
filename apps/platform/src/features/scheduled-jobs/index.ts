/**
 * Public surface of the scheduled-jobs feature. `/admin/jobs` (features/jobs)
 * mounts the tab through this index instead of deep-importing components
 * (docs/conventions/feature-structure.md R3).
 */
export { ScheduledJobsTab } from "./components/ScheduledJobsTable"
export { scheduledJobsApi } from "./api"
export { scheduledJobKeys } from "./hooks"
export type { JobConfigUpdate, JobStatus, RunsPage, ScheduledJob, ScheduledJobRun } from "./types"
