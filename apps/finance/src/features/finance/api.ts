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
  /**
   * COA v2 chart (fin_coa_accounts) — the table the posting resolver
   * validates against. `nature` narrows to D | C | B (off-balance memo);
   * `version` pins a COA version, otherwise the tenant's active one. The BE
   * returns the full (unpaged) filtered set as the standard list envelope.
   */
  listCoaAccounts: (params?: { version?: string; nature?: string }) =>
    api
      .get<ApiSuccess<ListResponse<CoaAccount>>>(
        `/api/finance/coa/accounts?${buildSearchParams({
          version: params?.version,
          nature: params?.nature,
        }).toString()}`
      )
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
  runStatement: (
    code: string,
    asOf?: string,
    coaVersion?: string,
    from?: string
  ) => {
    const p = buildSearchParams({ as_of: asOf, coa_version: coaVersion, from })
    return api
      .get<ApiSuccess<StatementResult>>(
        `/api/finance/statements/${encodeURIComponent(code)}/run?${p.toString()}`
      )
      .then((res) => res.result)
  },
  financialSummary: (asOf?: string, from?: string) => {
    const p = buildSearchParams({ as_of: asOf, from })
    return api
      .get<ApiSuccess<FinancialSummary>>(
        `/api/finance/reports/financial-summary?${p.toString()}`
      )
      .then((res) => res.result)
  },
  riskExceptions: (asOf?: string) => {
    const p = buildSearchParams({ as_of: asOf })
    return api
      .get<ApiSuccess<{ items: RiskException[] }>>(
        `/api/finance/reports/risk-exceptions?${p.toString()}`
      )
      .then((res) => res.result.items)
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
  total_amount_minor?: number
}

/** fin_coa_accounts row (COA v2 — the table posting validation resolves). */
export interface CoaAccount {
  id: string
  tenantId: string
  versionCode: string
  accCode: string
  name: string
  accType: string
  accNature: "DEBIT" | "CREDIT" | "B"
  parentCode?: string | null
  isInternal: boolean
  isPostable: boolean
  effectiveDate: string
  expiryDate?: string | null
  description?: string | null
  createdAt: string
  updatedAt: string
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

export type PostingFlow =
  | "SINGLE_ENTRY"
  | "DOUBLE_ENTRY"
  | "OFF_BALANCE"
  | "CANCELLATION"
  | "CLOSING"

/** Kỳ kết chuyển (FAC.203.01): D = Ngày, M = Tháng, Q = Quý, Y = Năm. */
export type ClosingPeriodType = "D" | "M" | "Q" | "Y"

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

/** One row of GET /api/finance/closing/accounts (unpaged list envelope). */
export interface ClosingAccountRow {
  acc_code: string
  acc_name: string
  acc_purpose: "INC" | "EXP"
  acc_nature: string
  balance_minor: number
  closing_amount_minor: number
}

/** Closing body (FAC.203.01) — the BE builds the bút toán itself (INC →
 * DEBIT tài khoản thu + CREDIT đích, EXP → CREDIT tài khoản chi + DEBIT
 * đích); the FE sends only the per-account closing amounts, never lines. */
export interface ClosingRequest {
  idempotency_key?: string
  accounting_date: string
  period_type: ClosingPeriodType
  description?: string
  trader: TraderInfo
  rows: {
    acc_code: string
    acc_purpose: "INC" | "EXP"
    amount_minor: number
  }[]
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
    },
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

/**
 * Closing accounts (FAC.203.01) — GET /api/finance/closing/accounts returns
 * the closable account set for one accounting date (unpaged standard list
 * envelope; read `.items`). Every returned row is closed at
 * `closing_amount_minor` — the tab-2 table is read-only, no selection.
 */
export const closingApi = {
  accounts: (accountingDate: string) =>
    api
      .get<ApiSuccess<ListResponse<ClosingAccountRow>>>(
        `/api/finance/closing/accounts?${buildSearchParams({
          accounting_date: accountingDate,
        }).toString()}`
      )
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
  from_date?: string
  coa_version?: string
  rows: StatementRow[]
}

export interface FinancialSummary {
  as_of: string
  from_date?: string
  total_assets_minor: number
  total_liabilities_minor: number
  total_equity_minor: number
  total_income_minor: number
  total_expense_minor: number
  profit_minor: number
}

export interface RiskException {
  account_code: string
  currency_code: string
  coa_version: string
  close_debit_minor: number
  close_credit_minor: number
  reason: string
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
  /** XLSX posting-sheet import → creates a manual posting case. */
  importPostingCases: (input: {
    file: File
    flow: PostingFlow
    accountingDate?: string
  }) => {
    const form = new FormData()
    form.append("file", input.file)
    form.append("flow", input.flow)
    if (input.accountingDate) form.append("accounting_date", input.accountingDate)
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

// ── Posting review (maker confirm / checker approve before posting) ────────

export interface ReviewWorkItem {
  id: string
  caseId: string
  caseCode: string
  caseType: string
  title: string
  status: string
  stepCode: string
  stepName?: string
  jobKey?: string
  processInstanceKey?: string
  canClaim?: boolean
  canOpen?: boolean
  assignedTo?: string
  candidateRole?: string
  createdBy?: string
}

export interface ReviewCaseVariables {
  case_id: string
  process_instance_key: string
  variables: Record<string, unknown>
}

export const workflowTaskApi = {
  getWorkItem: (id: string) =>
    api
      .get<ApiSuccess<ReviewWorkItem>>(
        `/api/workflow/work-items/${encodeURIComponent(id)}`
      )
      .then((res) => res.result),
  claimWorkItem: (id: string) =>
    api
      .post<ApiSuccess<{ workItem: ReviewWorkItem }>>(
        `/api/workflow/work-items/${encodeURIComponent(id)}/claim`,
        {}
      )
      .then((res) => res.result),
  getCaseVariables: (caseId: string) =>
    api
      .get<ApiSuccess<ReviewCaseVariables>>(
        `/api/workflow/cases/${encodeURIComponent(caseId)}/variables`
      )
      .then((res) => res.result),
  completeTask: (input: {
    jobKey: string
    processInstanceKey: string
    elementId: string
    variables: Record<string, unknown>
  }) =>
    api
      .post<ApiSuccess<{ status: string }>>(
        `/api/workflow/tasks/${encodeURIComponent(input.jobKey)}/complete`,
        {
          processInstanceKey: input.processInstanceKey,
          elementId: input.elementId,
          variables: input.variables,
        }
      )
      .then((res) => res.result),
}

/** One posted ledger line for the per-account ledger view. */
export interface LedgerLine {
  entry_no: number
  entry_date: string
  document_type: string
  description: string
  debit_minor: number
  credit_minor: number
  entry_id: string
}

export interface LedgerResult {
  account_code: string
  opening_minor: number
  lines: LedgerLine[]
}

/** VCM cash transactions (W7). */
export interface CashTxn {
  txn_date: string
  direction: "IN" | "OUT"
  amount_minor: number
  currency_code: string
  org_code?: string
  description?: string
  journal_entry_id?: string
}

export interface CashPositionRow {
  txn_date: string
  currency_code: string
  cash_in_minor: number
  cash_out_minor: number
  net_minor: number
}

export function listCash(params: { from?: string; to?: string; direction?: string } = {}) {
  const search = buildSearchParams({
    from: params.from,
    to: params.to,
    direction: params.direction,
  })
  const qs = search.toString()
  return api
    .get<ApiSuccess<ListResponse<CashTxn>>>(`/api/finance/cash${qs ? `?${qs}` : ""}`)
    .then((res) => res.result)
}

export function recordCash(body: {
  txn_date: string
  direction: "IN" | "OUT"
  amount_minor: number
  currency_code?: string
  description?: string
}) {
  return api
    .post<ApiSuccess<CashTxn>>("/api/finance/cash", body)
    .then((res) => res.result)
}

export function cashPosition() {
  return api
    .get<ApiSuccess<{ rows: CashPositionRow[] }>>("/api/finance/cash-position")
    .then((res) => res.result.rows)
}

/** Per-account ledger (sổ cái/sổ chi tiết) for [from, to]. */
export function getLedger(params: { account: string; from: string; to: string }) {
  const search = buildSearchParams({ account: params.account, from: params.from, to: params.to })
  return api
    .get<ApiSuccess<LedgerResult>>(`/api/finance/ledger?${search.toString()}`)
    .then((res) => res.result)
}

/** Counterparty master types + API (W4c-E). */
export interface Counterparty {
  id: string
  tenant_id: string
  code: string
  name: string
  party_type: string
  org_code?: string
  note?: string
  is_active: boolean
  created_at?: string
}

export interface CounterpartyAccount {
  id: string
  counterparty_id: string
  account_no: string
  bank_code?: string
  coa_account_code?: string
  currency_code: string
  is_default: boolean
}

export const counterpartyApi = {
  list: (params: { q?: string; party_type?: string; include_inactive?: boolean } = {}) => {
    const search = buildSearchParams({
      q: params.q,
      party_type: params.party_type,
      include_inactive: params.include_inactive ? "true" : undefined,
    })
    const suffix = search.size ? `?${search.toString()}` : ""
    return api
      .get<ApiSuccess<ListResponse<Counterparty>>>(`/api/finance/counterparties${suffix}`)
      .then((res) => res.result)
  },
  upsert: (body: Partial<Counterparty>) =>
    api
      .post<ApiSuccess<Counterparty>>("/api/finance/counterparties", body)
      .then((res) => res.result),
  update: (id: string, body: Partial<Counterparty>) =>
    api
      .put<ApiSuccess<Counterparty>>(`/api/finance/counterparties/${encodeURIComponent(id)}`, body)
      .then((res) => res.result),
  deactivate: (id: string) =>
    api
      .delete<ApiSuccess<{ ok: boolean }>>(`/api/finance/counterparties/${encodeURIComponent(id)}`)
      .then((res) => res.result),
  listAccounts: (id: string) =>
    api
      .get<ApiSuccess<ListResponse<CounterpartyAccount>>>(
        `/api/finance/counterparties/${encodeURIComponent(id)}/accounts`
      )
      .then((res) => res.result),
  upsertAccount: (id: string, body: Partial<CounterpartyAccount>) =>
    api
      .post<ApiSuccess<CounterpartyAccount>>(
        `/api/finance/counterparties/${encodeURIComponent(id)}/accounts`,
        body
      )
      .then((res) => res.result),
}
