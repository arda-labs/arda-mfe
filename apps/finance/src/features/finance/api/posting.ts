import { api, type ApiSuccess } from "@workspace/api"
import {
  buildListSearchParams,
  type ListQueryInput,
  type ListResponse,
} from "@workspace/api/list"
import { buildSearchParams } from "@workspace/api/query"
import type { ClosingRequest } from "./closing"
import type { TraderInfo } from "./types"

export interface JournalEntry {
  id: string
  entry_no: number
  accounting_date: string
  currency_code: string
  status: string
  description: string
  business_domain: string
  document_type: string
  document_code: string
  case_id: string
  created_at: string
  total_amount_minor?: number
}

export interface ValidationLine {
  line_no: number
  resolved: boolean
  account_code: string
  account_name: string
  coa_version: string
  direction: string
  amount_minor: number
  currency_code: string
  errors: string[]
  description: string
}

export interface ValidationResult {
  valid: boolean
  lines: ValidationLine[]
  global_errors: string[]
  coa_version_id: string
}

export interface OpeningBalance {
  accounting_date: string
  coa_version: string
  account_code: string
  currency_code: string
  direction: string
  amount_minor: number
  description: string
  source_key: string
}

export interface PostingPreviewInput {
  accounting_date: string
  currency_code: string
  document_type: string
  lines: {
    line_no: number
    direction: string
    amount_minor: number
    /** Manual posting path (account_code set → direct COA resolution). */
    account_code?: string
    /** Empty = the COA version effective on the accounting_date. */
    coa_version?: string
    analytics?: Record<string, string>
    description?: string
  }[]
}

export type PostingFlow =
  "SINGLE_ENTRY" | "DOUBLE_ENTRY" | "OFF_BALANCE" | "CANCELLATION" | "CLOSING"

export interface PostingCaseLine {
  line_no: number
  direction: "DEBIT" | "CREDIT"
  amount_minor: number
  currency_code?: string
  account_code: string
  coa_version?: string
  counterparty_code?: string
  description?: string
}

export interface PostingCaseRequest {
  idempotency_key?: string
  accounting_date: string
  currency_code: string
  description: string
  lines: PostingCaseLine[]
}

/** Cancellation body (FAC.300.01) — references the journal entry to reverse;
 * the BE writes document_type FIN_TXN_CANCEL on the reversal record. */
export interface CancellationRequest {
  idempotency_key?: string
  reference_entry_no: number
  reason: string
  accounting_date: string
  trader: TraderInfo
}

export interface PostingCaseCreated {
  case_id: string
  case_code: string
}

/**
 * Manual posting cases (FAC): the BE validates structure per flow
 * (SINGLE_ENTRY = exactly 1 DEBIT + 1 CREDIT with equal amounts,
 * DOUBLE_ENTRY = balanced, OFF_BALANCE = N same-direction lines over
 * nature-B accounts, CANCELLATION = reversal reference, CLOSING =
 * per-account closing rows) and routes the case to the workbench for
 * approval (FIN_SINGLE_ENTRY_V2 / FIN_DOUBLE_ENTRY_V2 / FIN_OFF_BALANCE_V2 /
 * FIN_TXN_CANCEL_V2 / FIN_CLOSING_V2).
 */
export const postingCaseApi = {
  create: (
    flow: PostingFlow,
    request: {
      posting_request?: PostingCaseRequest
      cancellation_request?: CancellationRequest
      closing_request?: ClosingRequest
    }
  ) =>
    api
      .post<ApiSuccess<PostingCaseCreated>>("/api/finance/posting-cases", {
        flow,
        posting_request: request.posting_request,
        cancellation_request: request.cancellation_request,
        closing_request: request.closing_request,
      })
      .then((res) => res.result),
}

/** Posting stack (P1a) — journal read + posting preview + opening balances. */
export const postingApi = {
  listJournal: (params?: {
    from?: string
    to?: string
    document_type?: string
    limit?: number
  }) => {
    const p = buildSearchParams({
      from: params?.from,
      to: params?.to,
      document_type: params?.document_type,
      limit: params?.limit,
    })
    return api
      .get<ApiSuccess<JournalEntry[]>>(
        `/api/finance/journal-entries?${p.toString()}`
      )
      .then((res) => res.result)
  },
  /**
   * Server-tier journal list: q ILIKEs document_type / document_code /
   * description, sort whitelist (entry_no | accounting_date), page/per_page.
   * Extra filters pass through verbatim: `document_type` (exact),
   * `from_date`/`to_date` (accounting_date range) — used by the case lists
   * and the ChooseTransactionDialog picker.
   */
  listJournalPaged: (params?: ListQueryInput) =>
    api
      .get<ApiSuccess<ListResponse<JournalEntry>>>(
        `/api/finance/journal-entries?${buildListSearchParams(params).toString()}`
      )
      .then((res) => res.result),
  validate: (input: PostingPreviewInput) =>
    api
      .post<ApiSuccess<ValidationResult>>(
        "/api/finance/posting/validate",
        input
      )
      .then((res) => res.result),
  listOpeningBalances: (asOf?: string) => {
    const p = buildSearchParams({ as_of: asOf })
    return api
      .get<ApiSuccess<OpeningBalance[]>>(
        `/api/finance/opening-balances?${p.toString()}`
      )
      .then((res) => res.result)
  },
  upsertOpeningBalance: (data: {
    accounting_date: string
    coa_version: string
    account_code: string
    currency_code: string
    direction: string
    amount_minor: number
    description?: string
    source_key?: string
  }) =>
    api
      .post<ApiSuccess<{ saved: boolean }>>(
        "/api/finance/opening-balances",
        data
      )
      .then((res) => res.result),
  /** XLSX posting-sheet import → creates a manual posting case. */
  importPostingCases: (input: {
    file: File
    flow: PostingFlow
    accountingDate?: string
  }) => {
    const form = new FormData()
    form.append("file", input.file)
    form.append("flow", input.flow)
    if (input.accountingDate)
      form.append("accounting_date", input.accountingDate)
    return api
      .post<
        ApiSuccess<{
          case_id: string
          case_code: string
          line_count: number
          accounting_date: string
        }>
      >("/api/finance/posting-cases/import", form)
      .then((res) => res.result)
  },
  /** Fund appropriation/utilization → FIN_FUND_APPROP_V2 / FIN_FUND_USE_V2 case. */
  createFundCase: (input: {
    accounting_date: string
    action: "APPROPRIATION" | "UTILIZATION"
    fund_code: string
    amount_minor: number
    description?: string
  }) =>
    api
      .post<ApiSuccess<{ case_id: string; case_code: string }>>(
        "/api/finance/posting-cases",
        { flow: "FUND", fund_request: input }
      )
      .then((res) => res.result),
}
