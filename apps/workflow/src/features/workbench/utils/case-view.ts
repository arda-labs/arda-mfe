import type { WorkItem } from "../api/types"

/** Where "Back" goes when the link carries no (valid) returnUrl. */
export const CASE_VIEW_FALLBACK_URL = "/workbench/transaction-search"

export interface CaseViewRequest {
  caseCode: string
  returnUrl: string
}

/**
 * `?caseCode=X&mode=view[&returnUrl=/...]` opens the read-only case screen.
 * `caseCode` without `mode=view` stays the incoming list's burst-refetch hint,
 * so it must NOT be parsed as a view request.
 */
export function parseCaseViewRequest(search: string): CaseViewRequest | null {
  const params = new URLSearchParams(search)
  if (params.get("mode") !== "view") return null
  const caseCode = params.get("caseCode")?.trim()
  if (!caseCode) return null
  return {
    caseCode,
    returnUrl: safeReturnUrl(params.get("returnUrl")),
  }
}

/**
 * `returnUrl` comes from the query string, so only same-origin paths pass:
 * a single leading `/`, no `//` or `/\` (protocol-relative / browser-normalised
 * to `//`), no backslash anywhere, no control characters or whitespace.
 */
export function safeReturnUrl(
  raw: string | null | undefined,
  fallback: string = CASE_VIEW_FALLBACK_URL
): string {
  if (!raw) return fallback
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback
  if (raw.includes("\\")) return fallback
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f-\u009f\s]/.test(raw)) return fallback
  return raw
}

/**
 * The work item that supplies the screen's form and `formKey`: exact
 * `caseCode` only (the list endpoint matches by keyword), preferring items
 * that carry a `formKey`, then the most recently updated step.
 */
export function pickCaseViewItem(
  items: readonly WorkItem[],
  caseCode: string
): WorkItem | undefined {
  const wanted = caseCode.trim()
  const matches = items.filter((item) => item.caseCode === wanted)
  if (matches.length === 0) return undefined
  return [...matches].sort((a, b) => {
    const byForm = Number(Boolean(b.formKey)) - Number(Boolean(a.formKey))
    if (byForm !== 0) return byForm
    return timestamp(b.updatedAt) - timestamp(a.updatedAt)
  })[0]
}

function timestamp(value: string | null | undefined) {
  const ms = value ? Date.parse(value) : NaN
  return Number.isNaN(ms) ? 0 : ms
}
