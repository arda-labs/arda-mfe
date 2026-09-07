import { defineServerList } from "@workspace/list-page/server-list"

export const JOURNAL_DEFAULT_PAGE_SIZE = 20

/**
 * URL-synced list contract for the general journal (read-only ledger). The
 * toolbar search `document_type` maps to the API `q` parameter — the BE
 * ILIKEs document type, document code and description together. Sortable
 * columns must equal the BE whitelist (entry_no | accounting_date) exactly;
 * the ledger defaults to newest-first (entry_no DESC).
 */
export const journalListDefinition = defineServerList({
  queryKey: ["finance", "journal", "list"] as const,
  queryConfig: {
    defaultPageSize: JOURNAL_DEFAULT_PAGE_SIZE,
    sortableColumns: ["entry_no", "accounting_date"],
    filters: [{ urlKey: "document_type", apiKey: "q", mode: "text" }],
  },
} as const)
