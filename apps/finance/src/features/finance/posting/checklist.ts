import { isValidISODate, parseMoneyInput } from "@workspace/format"
import type { EntryLineRow } from "@workspace/posting-flow/types"

export type PostingCheckId =
  | "date"
  | "currency"
  | "accounts"
  | "amounts"
  | "balanced"
  | "description"
  | "attachments"

export type PostingCheck = {
  id: PostingCheckId
  state: "ok" | "error" | "warning"
  /** Rows to fix (accounts / amounts), for the hint. */
  count?: number
}

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
  const missingAccounts = rows.filter((row) => !row.account_code.trim()).length
  const badAmounts = rows.filter((row) => (parseMoneyInput(row.amount) ?? 0) <= 0).length
  const checks: PostingCheck[] = [
    { id: "date", state: isValidISODate(accountingDate) ? "ok" : "error" },
    { id: "currency", state: /^[A-Z]{3}$/.test(currency) ? "ok" : "error" },
    { id: "accounts", state: missingAccounts === 0 ? "ok" : "error", count: missingAccounts },
    { id: "amounts", state: badAmounts === 0 ? "ok" : "error", count: badAmounts },
  ]
  if (requireBalanced) checks.push({ id: "balanced", state: balanced ? "ok" : "error" })
  checks.push(
    { id: "description", state: description.trim() ? "ok" : "warning" },
    { id: "attachments", state: attachmentCount > 0 ? "ok" : "warning" }
  )
  return checks
}
