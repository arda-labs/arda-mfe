import { api, type ApiSuccess } from "@workspace/api"
import {
  buildListSearchParams,
  type ListQueryInput,
  type ListResponse,
} from "@workspace/api/list"
import type { JournalEntry } from "./posting"
import type { TraderInfo } from "./types"

/** One line of the original journal entry (read-only display). */
export interface JournalEntryLine {
  line_no: number
  direction: "DEBIT" | "CREDIT"
  account_code: string
  account_name: string
  amount_minor: number
  currency_code?: string
  description?: string
}

/**
 * GET /api/finance/journal-entries/{entry_no}. The detail maps header fields
 * from the snake_case wire shape (business_doc_type, business_doc_code,
 * business_doc_id — not the list-row document_type/document_code names);
 * trader stays optional until the BE stamps it on entries. `metadata` is the
 * free-form key/value stamp from the originating case — the BE mirrors the
 * trader block there as trader_object_type | trader_object_code |
 * trader_object_name | trader_id_number | trader_issue_date |
 * trader_issue_place | trader_address.
 */
export interface JournalEntryDetail {
  journal_entry_id: string
  entry_no: number
  accounting_date: string
  currency_code: string
  status: string
  description: string
  business_domain: string
  business_doc_type: string
  business_doc_id?: string
  case_id: string
  reversed_by_entry_id?: string
  total_amount_minor: number
  created_by?: string
  created_at: string
  lines: JournalEntryLine[]
  trader?: TraderInfo
  metadata?: Record<string, string>
  /** Row version the checker saw — sent back as `dataVersion` on approve. */
  data_version?: number
}

/**
 * Journal-entry read API for the cancellation flow:
 * - `paged`: same endpoint as postingApi.listJournalPaged (search/paginated
 *   picker over GET /api/finance/journal-entries) with the ChooseTransactionDialog
 *   filter params (document_type, from_date, to_date, q, page, page_size).
 * - `detail`: GET /api/finance/journal-entries/{entry_no} — original-entry
 *   detail (read-only bút toán grid + summary).
 */
export const journalEntryApi = {
  paged: (params?: ListQueryInput) =>
    api
      .get<ApiSuccess<ListResponse<JournalEntry>>>(
        `/api/finance/journal-entries?${buildListSearchParams(params).toString()}`
      )
      .then((res) => res.result),
  detail: (entryNo: number) =>
    api
      .get<ApiSuccess<JournalEntryDetail>>(
        `/api/finance/journal-entries/${encodeURIComponent(entryNo)}`
      )
      .then((res) => res.result),
  /**
   * GET /api/finance/journal-entries/by-case/{caseId} — the latest posting
   * staged for a workflow case, PENDING included. This is the narrow read the
   * fund checker form uses (the general journal read hides PENDING entries).
   */
  casePosting: (caseId: string) =>
    api
      .get<ApiSuccess<JournalEntryDetail>>(
        `/api/finance/journal-entries/by-case/${encodeURIComponent(caseId)}`
      )
      .then((res) => res.result),
}
