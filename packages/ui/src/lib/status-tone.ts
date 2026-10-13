/**
 * Lifecycle tones (design board 02): draft/void are neutral, in-flight work
 * is info, waiting on someone is pending (amber), done is success, booked to
 * the ledger is posted (violet), rejected/failed is danger.
 */
export type StatusTone = "neutral" | "info" | "pending" | "success" | "posted" | "danger"

const TONE_BY_STATUS: Record<string, StatusTone> = {
  DRAFT: "neutral",
  NEW: "neutral",
  CREATED: "neutral",
  PLANNED: "neutral",
  INACTIVE: "neutral",
  DISABLED: "neutral",
  ARCHIVED: "neutral",
  CLOSED: "neutral",
  EXPIRED: "neutral",
  CANCELLED: "neutral",
  CANCELED: "neutral",
  REVERSED: "neutral",
  VOID: "neutral",
  SKIPPED: "neutral",
  OPEN: "info",
  RUNNING: "info",
  IN_PROGRESS: "info",
  PROCESSING: "info",
  PENDING: "pending",
  PENDING_APPROVAL: "pending",
  SUBMITTED: "pending",
  WAITING: "pending",
  IN_REVIEW: "pending",
  NEEDS_CHANGES: "pending",
  QUEUED: "pending",
  PARTIALLY_PAID: "pending",
  ACTIVE: "success",
  ENABLED: "success",
  APPROVED: "success",
  COMPLETED: "success",
  DONE: "success",
  SUCCESS: "success",
  SUCCEEDED: "success",
  PAID: "success",
  DISBURSED: "success",
  VERIFIED: "success",
  POSTED: "posted",
  BOOKED: "posted",
  REJECTED: "danger",
  FAILED: "danger",
  FAILURE: "danger",
  ERROR: "danger",
  INCIDENT: "danger",
  DENIED: "danger",
  LOCKED: "danger",
  SUSPENDED: "danger",
  OVERDUE: "danger",
  SUBMIT_FAILED: "danger",
  TIMED_OUT: "danger",
}

/** Tone for a backend status code; unknown codes are neutral. */
export function statusTone(status: string | null | undefined): StatusTone {
  return TONE_BY_STATUS[(status ?? "").trim().toUpperCase()] ?? "neutral"
}
