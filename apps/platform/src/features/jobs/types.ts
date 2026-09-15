/**
 * Wire/view types for COB jobs + run history (W6).
 * Wire source: arda-be/apps/platform-service (job handlers).
 */
export interface JobDefinition {
  code: string
  name: string
  sequence: number
  endpoint: string
  is_enabled: boolean
}

export interface JobRun {
  job_code: string
  business_date: string
  status: string
  error?: string
  started_at?: string
  finished_at?: string
}

export interface CobRunResult {
  business_date: string
  steps: { job_code: string; status: string; error?: string }[]
}
