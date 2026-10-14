import { defineServerList } from "@workspace/list-page/server-list"

export const POSTING_DEFAULT_PAGE_SIZE = 20

/** fin_journal_entries statuses the BE accepts as `status` (its whitelist). */
export const POSTING_STATUSES = ["PENDING", "POSTED", "REVERSED", "VOID"] as const

/**
 * The BE defaults an empty `status` to POSTED,REVERSED; a case list asks for
 * every status so "Tất cả" also shows proposals awaiting approval (PENDING)
 * and released ones (VOID).
 */
export const postingStatusParam = (status: string | undefined) =>
  status ?? POSTING_STATUSES.join(",")

/**
 * URL-synced list contract for the manual posting-case lists (bút toán lẻ /
 * bút toán kép / ngoại bảng / hủy giao dịch / kết chuyển). The screen pins the
 * document type itself — the page's queryFn adds `document_type` (exact BE
 * filter) on top of the parsed query, and extends the query key with it so
 * the five lists never share a cache entry. `status` drives the saved-view
 * tabs. Sortable columns must equal the BE whitelist
 * (entry_no | accounting_date); newest-first default.
 */
export const postingListDefinition = defineServerList({
  queryKey: ["finance", "posting", "list"] as const,
  queryConfig: {
    defaultPageSize: POSTING_DEFAULT_PAGE_SIZE,
    sortableColumns: ["entry_no", "accounting_date"],
    filters: [{ urlKey: "status", mode: "single", allowedValues: POSTING_STATUSES }],
  },
} as const)
