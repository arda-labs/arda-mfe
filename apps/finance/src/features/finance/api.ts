import { api, type ApiSuccess } from "@workspace/api"
import { buildListSearchParams, type ListQueryInput, type ListResponse } from "@workspace/api/list"
import { buildSearchParams } from "@workspace/api/query"

export interface Account {
  id: string
  tenantId: string
  code: string
  name: string
  type: string
  normalBalance: string
  currency: string
  isActive: boolean
  parentId?: string
  createdAt: string
}

/** Trial-balance row — journal-aggregated, int64 minor units (§5 conventions). */
export interface TrialBalanceEntry {
  account_code: string
  account_name: string
  coa_version: string
  currency_code: string
  debit_minor: number
  credit_minor: number
  balance_minor: number
}

export interface TrialBalanceResult {
  tenant_id: string
  as_of: string
  entries: TrialBalanceEntry[]
  total_debit_minor: number
  total_credit_minor: number
}

export const financeApi = {
  listAccounts: () =>
    api
      .get<ApiSuccess<{ accounts: Account[] }>>("/api/finance/accounts")
      .then((res) => res.result),  /**
   * Server-tier account list: q ILIKEs code+name, sort whitelist
   * (code | name | created_at), page/per_page. The BE keeps the
   * `{ accounts: [...] }` result shape and adds page/per_page/total — this
   * adapter normalizes it to the standard ListResponse for the data table.
   */
  listAccountsPaged: (params?: ListQueryInput) =>
    api
      .get<
        ApiSuccess<{ accounts: Account[] } & Partial<ListResponse<Account>>>
      >(`/api/finance/accounts?${buildListSearchParams(params).toString()}`)
      .then((res): ListResponse<Account> => {
        const accounts = res.result.accounts ?? []
        return {
          items: accounts,
          page: res.result.page ?? params?.page ?? 1,
          per_page:
            res.result.per_page ?? params?.perPage ?? Math.max(accounts.length, 1),
          total: res.result.total ?? accounts.length,
        }
      }),
  getAccount: (id: string) =>
    api
      .get<ApiSuccess<Account>>(`/api/finance/accounts/${id}`)
      .then((res) => res.result),
  createAccount: (data: {
    code: string
    name: string
    type: string
    normalBalance: string
    currency?: string
    parentId?: string
  }) =>
    api
      .post<ApiSuccess<Account>>("/api/finance/accounts", data)
      .then((res) => res.result),
  trialBalance: (asOf?: string) => {
    const p = buildSearchParams({ as_of: asOf })
    return api
      .get<ApiSuccess<TrialBalanceResult>>(
        `/api/finance/trial-balance?${p.toString()}`
      )
      .then((res) => res.result)
  },
  // ── Statements (P3b) — fixed-format reports over fin_trial_balance_daily ──

  listStatements: () =>
    api
      .get<ApiSuccess<{ statements: StatementSummary[] }>>(
        "/api/finance/statements"
      )
      .then((res) => res.result.statements),
  runStatement: (code: string, asOf?: string, coaVersion?: string) => {
    const p = buildSearchParams({ as_of: asOf, coa_version: coaVersion })
    return api
      .get<ApiSuccess<StatementResult>>(
        `/api/finance/statements/${encodeURIComponent(code)}/run?${p.toString()}`
      )
      .then((res) => res.result)
  },
}

export interface SystemDate {
  id: string
  branchCode: string
  currentBusinessDate: string
  previousBusinessDate: string
  nextBusinessDate: string
  status: string
  lastEODAt?: string
  updatedAt: string
}

export interface HolidayCalendar {
  id: string
  holidayDate: string
  description: string
  isRecurring: boolean
  createdAt: string
}

// ── Posting stack (P1a) — journal read + posting preview + opening balances ──

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

// ── Posting cases (iteration 9 — bút toán lẻ / bút toán kép) ────────────────

export type PostingFlow = "SINGLE_ENTRY" | "DOUBLE_ENTRY" | "OFF_BALANCE" | "CANCELLATION"

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

/** Trader/object info block (Thông tin đối tượng) — FAC.201.01 / FAC.300.01. */
export interface TraderInfo {
  object_type: string
  object_code?: string
  object_name?: string
  id_number?: string
  issue_date?: string
  issue_place?: string
  address?: string
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
 * nature-B accounts, CANCELLATION = reversal reference) and routes the case
 * to the workbench for approval (FIN_SINGLE_ENTRY_V2 / FIN_DOUBLE_ENTRY_V2 /
 * FIN_OFF_BALANCE_V2 / FIN_TXN_CANCEL_V2).
 */
export const postingCaseApi = {
  create: (
    flow: PostingFlow,
    request: { posting_request?: PostingCaseRequest; cancellation_request?: CancellationRequest },
  ) =>
    api
      .post<ApiSuccess<PostingCaseCreated>>("/api/finance/posting-cases", {
        flow,
        posting_request: request.posting_request,
        cancellation_request: request.cancellation_request,
      })
      .then((res) => res.result),
}

// ── Journal entry detail (cancellation reference) ───────────────────────────

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
 * GET /api/finance/journal-entries/{entry_no}. Summary fields beyond the
 * lines (trader, total) stay optional until the BE contract fully lands —
 * the cancellation summary degrades to "—" for missing values.
 */
export interface JournalEntryDetail extends JournalEntry {
  lines: JournalEntryLine[]
  total_amount_minor?: number
  trader?: TraderInfo
}

export interface StatementSummary {
  statement_code: string
  row_count: number
}

/** One rendered statement line (fin_statement_formula row, evaluated). */
export interface StatementRow {
  row_code: string
  parent_code?: string
  label: string
  level: number
  sort_order: number
  is_total: boolean
  amount_minor: number
  has_amount: boolean
}

export interface StatementResult {
  tenant_id: string
  statement_code: string
  as_of: string
  coa_version?: string
  rows: StatementRow[]
}

export const postingApi = {
  listJournal: (params?: { from?: string; to?: string; document_type?: string; limit?: number }) => {
    const p = buildSearchParams({
      from: params?.from,
      to: params?.to,
      document_type: params?.document_type,
      limit: params?.limit,
    })
    return api
      .get<ApiSuccess<JournalEntry[]>>(`/api/finance/journal-entries?${p.toString()}`)
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
      .post<ApiSuccess<ValidationResult>>("/api/finance/posting/validate", input)
      .then((res) => res.result),
  listOpeningBalances: (asOf?: string) => {
    const p = buildSearchParams({ as_of: asOf })
    return api
      .get<ApiSuccess<OpeningBalance[]>>(`/api/finance/opening-balances?${p.toString()}`)
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
      .post<ApiSuccess<{ saved: boolean }>>("/api/finance/opening-balances", data)
      .then((res) => res.result),
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
}
