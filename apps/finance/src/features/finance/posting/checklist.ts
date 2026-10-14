import { isValidISODate, parseMoneyInput } from "@workspace/format"
import type { EntryLineRow } from "@workspace/posting-flow/types"
import type { ChecklistItem } from "@workspace/ui/components/pre-submit-checklist"

export type PostingCheckId =
  | "date"
  | "currency"
  | "accounts"
  | "amounts"
  | "amount"
  | "balanced"
  | "reference"
  | "reversible"
  | "reason"
  | "closing_rows"
  | "description"
  | "attachments"

export type PostingCheck = {
  id: PostingCheckId
  state: "ok" | "error" | "warning"
  /** Rows to fix (accounts / amounts), for the hint. */
  count?: number
  /** Hint key stem when one check has several failure reasons. */
  hintId?: string
}

const dateCheck = (accountingDate: string): PostingCheck => ({
  id: "date",
  state: isValidISODate(accountingDate) ? "ok" : "error",
})

const currencyCheck = (currency: string): PostingCheck => ({
  id: "currency",
  state: /^[A-Z]{3}$/.test(currency) ? "ok" : "error",
})

const accountsCheck = (rows: EntryLineRow[]): PostingCheck => {
  const missing = rows.filter((row) => !row.account_code.trim()).length
  return { id: "accounts", state: missing === 0 ? "ok" : "error", count: missing }
}

/** What reviewers ask for most: allowed through, but flagged. */
const reviewerWarnings = (description: string | undefined, attachmentCount: number): PostingCheck[] => [
  ...(description === undefined
    ? []
    : [{ id: "description", state: description.trim() ? "ok" : "warning" } satisfies PostingCheck]),
  { id: "attachments", state: attachmentCount > 0 ? "ok" : "warning" },
]

/**
 * Pre-submit checks of a manual posting (bút toán lẻ / kép). Mirrors what
 * submit() and the BE refuse (errors) plus what reviewers ask for most
 * (warnings: description, supporting documents).
 */
export function postingChecklist({
  accountingDate,
  currency,
  rows,
  requireBalanced,
  balanced,
  description,
  attachmentCount,
}: {
  accountingDate: string
  currency: string
  rows: EntryLineRow[]
  requireBalanced: boolean
  balanced: boolean
  description: string
  attachmentCount: number
}): PostingCheck[] {
  const badAmounts = rows.filter((row) => (parseMoneyInput(row.amount) ?? 0) <= 0).length
  const checks: PostingCheck[] = [
    dateCheck(accountingDate),
    currencyCheck(currency),
    accountsCheck(rows),
    { id: "amounts", state: badAmounts === 0 ? "ok" : "error", count: badAmounts },
  ]
  if (requireBalanced) checks.push({ id: "balanced", state: balanced ? "ok" : "error" })
  return [...checks, ...reviewerWarnings(description, attachmentCount)]
}

/**
 * Hủy giao dịch: submit() requires a date, the original entry and a reason;
 * the workflow worker then refuses an original that is not POSTED or was
 * already reversed — checked here once its detail has loaded (a warning
 * while it is unknown). The reason is the description, so only the
 * attachment warning remains.
 */
export function cancellationChecklist({
  accountingDate,
  hasReference,
  original,
  reason,
  attachmentCount,
}: {
  accountingDate: string
  hasReference: boolean
  /** Original entry detail; undefined while loading or when it failed. */
  original: { status: string; reversedByEntryId?: string } | undefined
  reason: string
  attachmentCount: number
}): PostingCheck[] {
  const checks: PostingCheck[] = [
    dateCheck(accountingDate),
    { id: "reference", state: hasReference ? "ok" : "error" },
  ]
  if (hasReference) {
    checks.push(
      original === undefined
        ? { id: "reversible", state: "warning", hintId: "reversible_unknown" }
        : {
            id: "reversible",
            state: original.status === "POSTED" && !original.reversedByEntryId ? "ok" : "error",
          }
    )
  }
  checks.push({ id: "reason", state: reason.trim() ? "ok" : "error" })
  return [...checks, ...reviewerWarnings(undefined, attachmentCount)]
}

/**
 * Kết chuyển thu chi: submit() requires a date and at least one closing
 * row; rows still loading for a new date are not ready either.
 */
export function closingChecklist({
  accountingDate,
  rowCount,
  loading,
  description,
  attachmentCount,
}: {
  accountingDate: string
  rowCount: number
  loading: boolean
  description: string
  attachmentCount: number
}): PostingCheck[] {
  return [
    dateCheck(accountingDate),
    { id: "closing_rows", state: rowCount > 0 && !loading ? "ok" : "error" },
    ...reviewerWarnings(description, attachmentCount),
  ]
}

/**
 * Nhập/xuất ngoại bảng: one total mirrored onto every line, so the amount
 * is checked once; every line still needs a (nature-B) account.
 */
export function offBalanceChecklist({
  accountingDate,
  currency,
  rows,
  amount,
  description,
  attachmentCount,
}: {
  accountingDate: string
  currency: string
  rows: EntryLineRow[]
  amount: string
  description: string
  attachmentCount: number
}): PostingCheck[] {
  return [
    dateCheck(accountingDate),
    currencyCheck(currency),
    accountsCheck(rows),
    { id: "amount", state: (parseMoneyInput(amount) ?? 0) > 0 ? "ok" : "error" },
    ...reviewerWarnings(description, attachmentCount),
  ]
}

type Translate = (key: string, params?: Record<string, string | number>) => string

/** Checks → PreSubmitChecklist items (labels under finance.posting.checklist). */
export function toChecklistItems(checks: PostingCheck[], t: Translate): ChecklistItem[] {
  return checks.map((check) => ({
    id: check.id,
    state: check.state,
    label: t(`finance.posting.checklist.${check.id}`),
    hint:
      check.state === "ok"
        ? undefined
        : t(`finance.posting.checklist.${check.hintId ?? check.id}_hint`, { count: check.count ?? 0 }),
  }))
}
