import { api, type ApiSuccess } from "@workspace/api"
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
