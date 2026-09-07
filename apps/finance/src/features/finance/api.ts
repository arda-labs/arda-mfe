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
      .then((res) => res.result),
  /**
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
    analytics: Record<string, string>
    description?: string
  }[]
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
   * The BE answers with the standard ListResponse envelope.
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
