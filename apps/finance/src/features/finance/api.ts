import { api, type ApiSuccess } from "@workspace/api"
import { buildListSearchParams, type ListResponse } from "@workspace/api/list"
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

export interface AccountBalance {
  accountId: string
  balance: string
  asOf: string
}

export interface LedgerEntry {
  id: string
  entryId: string
  transactionId: string
  accountId: string
  entryType: string
  amount: string
  currency: string
  description?: string
}

export interface Transaction {
  id: string
  tenantId: string
  txnType: string
  txnDate: string
  postedAt: string
  status: string
  description?: string
  createdBy: string
  entries?: LedgerEntry[]
  createdAt: string
}

export interface ApprovalRequest {
  id: string
  tenantId: string
  requestType: string
  refId: string
  status: string
  currentLevel: number
  totalLevels: number
  makerId: string
  makerNote?: string
  amount?: string
  currency: string
  createdAt: string
  steps?: ApprovalStep[]
}

export interface ApprovalStep {
  id: string
  level: number
  checkerId: string
  decision: string
  note?: string
  decidedAt?: string
}

export const financeApi = {
  listAccounts: () =>
    api
      .get<ApiSuccess<{ accounts: Account[] }>>("/api/finance/accounts")
      .then((res) => res.result),
  getAccount: (id: string) =>
    api
      .get<ApiSuccess<{ account: Account; balance: AccountBalance }>>(
        `/api/finance/accounts/${id}`
      )
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
  listTransactions: (params?: {
    page?: number
    perPage?: number
    status?: string
    from?: string
    to?: string
  }) => {
    const p = buildListSearchParams({
      page: params?.page,
      perPage: params?.perPage,
      status: params?.status,
      from: params?.from,
      to: params?.to,
    })
    return api
      .get<ApiSuccess<ListResponse<Transaction>>>(
        `/api/finance/transactions?${p.toString()}`
      )
      .then((res) => res.result)
  },
  getTransaction: (id: string) =>
    api
      .get<ApiSuccess<Transaction>>(`/api/finance/transactions/${id}`)
      .then((res) => res.result),
  createTransaction: (data: {
    txnType: string
    txnDate?: string
    description?: string
    idempotencyKey?: string
    entries: {
      accountId: string
      type: string
      amount: string
      currency?: string
    }[]
  }) =>
    api
      .post<ApiSuccess<Transaction>>("/api/finance/transactions", data, {
        idempotencyKey: data.idempotencyKey,
      })
      .then((res) => res.result),
  reverseTransaction: (id: string, reason: string) =>
    api
      .post<ApiSuccess<Transaction>>(`/api/finance/transactions/${id}/reverse`, {
        reason,
      })
      .then((res) => res.result),
  createApproval: (data: {
    refId: string
    requestType: string
    amount?: string
    note?: string
  }) =>
    api
      .post<ApiSuccess<ApprovalRequest>>("/api/finance/approvals", data)
      .then((res) => res.result),
  listPendingApprovals: (level?: number) =>
    api
      .get<ApiSuccess<{ approvals: ApprovalRequest[] }>>(
        `/api/finance/approvals?level=${level || 1}`
      )
      .then((res) => res.result),
  getApproval: (id: string) =>
    api
      .get<ApiSuccess<ApprovalRequest>>(`/api/finance/approvals/${id}`)
      .then((res) => res.result),
  approveApproval: (id: string, note?: string) =>
    api
      .post<ApiSuccess<ApprovalRequest>>(
        `/api/finance/approvals/${id}/approve`,
        { note }
      )
      .then((res) => res.result),
  rejectApproval: (id: string, note?: string) =>
    api
      .post<ApiSuccess<ApprovalRequest>>(
        `/api/finance/approvals/${id}/reject`,
        { note }
      )
      .then((res) => res.result),
  cancelApproval: (id: string) =>
    api
      .post<ApiSuccess<ApprovalRequest>>(`/api/finance/approvals/${id}/cancel`)
      .then((res) => res.result),
  trialBalance: () =>
    api
      .get<ApiSuccess<{ tenantId: string; entries: { account: Account; balance: AccountBalance }[] }>>(
        "/api/finance/trial-balance"
      )
      .then((res) => res.result),

  // ── Calendar & Cut-off ──
  getCalendarStatus: (branchCode?: string) =>
    api
      .get<ApiSuccess<SystemDate>>(
        `/api/finance/calendar/status?branchCode=${branchCode || "HEAD_OFFICE"}`
      )
      .then((res) => res.result),
  triggerEOD: (branchCode?: string) =>
    api
      .post<ApiSuccess<{ message: string; data: SystemDate }>>(
        `/api/finance/calendar/eod?branchCode=${branchCode || "HEAD_OFFICE"}`
      )
      .then((res) => res.result),
  evaluateDate: (channel: string, type: string, time?: string) => {
    const p = buildSearchParams({ channel, type, time })
    return api
      .get<
        ApiSuccess<{
          channel: string
          type: string
          executionTime: string
          accountingDate: string
        }>
      >(`/api/finance/calendar/evaluate?${p.toString()}`)
      .then((res) => res.result)
  },
  listHolidays: () =>
    api
      .get<ApiSuccess<HolidayCalendar[]>>("/api/finance/calendar/holidays")
      .then((res) => res.result),
  addHoliday: (data: {
    date: string
    description: string
    isRecurring: boolean
  }) =>
    api
      .post<ApiSuccess<HolidayCalendar>>("/api/finance/calendar/holidays", data)
      .then((res) => res.result),
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
