type Translate = (key: string) => string

/**
 * Zeebe job state → locale key. Shared by the monitoring jobs tab and the
 * instance detail panel; keys stay under workflow.operate.* so the operate
 * panel and the monitoring views label the same state identically.
 */
export const JOB_STATE_KEYS: Record<string, string> = {
  ACTIVATABLE: "workflow.operate.job_state_activatable",
  ACTIVATED: "workflow.operate.job_state_activated",
  FAILED: "workflow.operate.job_state_failed",
  COMPLETED: "workflow.operate.job_state_completed",
  ERROR_THROWN: "workflow.operate.job_state_error_thrown",
  CANCELED: "workflow.operate.job_state_canceled",
  TIMED_OUT: "workflow.operate.job_state_timed_out",
}

export function jobStateLabel(t: Translate, state: string): string {
  const key = JOB_STATE_KEYS[state]
  return key ? t(key) : state
}
