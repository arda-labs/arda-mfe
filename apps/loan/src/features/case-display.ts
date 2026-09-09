/**
 * Case display helpers — the BE stamps `workflow_case_code`
 * (e.g. "LOAN-20260909-000123") alongside the uuid `workflow_case_id` on
 * contract / disbursement / collection rows. The friendly code is shown
 * first with the uuid as fallback; mid-truncation keeps head + tail
 * readable for long values (uuids) where CSS-only truncate would cut off
 * the informative tail (the sequence number).
 */

/** "LOAN-2026…000123" — head + ellipsis + tail, at most `max` chars. */
export function truncateMiddle(value: string | null | undefined, max = 22): string {
  if (!value) return ""
  if (value.length <= max) return value
  const keep = Math.max(1, Math.floor((max - 1) / 2))
  return `${value.slice(0, keep)}…${value.slice(-keep)}`
}

/** Friendly case label for a row: workflow_case_code, else the case uuid. */
export function caseDisplayLabel(
  code: string | undefined,
  id: string | undefined
): string | undefined {
  return code ?? id ?? undefined
}
