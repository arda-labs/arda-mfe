import { defineServerList } from "@workspace/list-page/server-list"

export const POSTING_DEFAULT_PAGE_SIZE = 20

/**
 * URL-synced list contract for the manual posting-case lists (bút toán lẻ /
 * bút toán kép). The screen pins the document type itself — the page's queryFn
 * adds `document_type` (exact BE filter) on top of the parsed query, so no
 * user-editable type filter is exposed here. Sortable columns must equal the
 * BE whitelist (entry_no | accounting_date); newest-first default.
 */
export const postingListDefinition = defineServerList({
  queryKey: ["finance", "posting", "list"] as const,
  queryConfig: {
    defaultPageSize: POSTING_DEFAULT_PAGE_SIZE,
    sortableColumns: ["entry_no", "accounting_date"],
  },
} as const)
