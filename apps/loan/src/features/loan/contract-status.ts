const LABEL_KEYS: Record<string, string> = {
  DRAFT: "loan.status.draft",
  PENDING_APPROVAL: "loan.status.pending",
  APPROVED: "loan.status.approved",
  ACTIVE: "loan.status.active",
  DISBURSED: "loan.status.disbursed",
  REJECTED: "loan.status.rejected",
  CANCELLED: "loan.status.cancelled",
  CLOSED: "loan.status.closed",
}

/** Translated status, falling back to the raw code for unknown values. */
export function contractStatusLabel(
  status: string,
  t: (key: string) => string
): string {
  const key = LABEL_KEYS[status]
  return key ? t(key) : status
}
