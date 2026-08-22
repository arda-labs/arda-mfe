import { api } from "@workspace/api"
import {
  buildListSearchParams,
  type ListResponse,
} from "@workspace/api/list"
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
  listAccounts: () => api.get<{ accounts: Account[] }>("/api/finance/accounts"),
  getAccount: (id: string) => api.get(`/api/finance/accounts/${id}`),
  createAccount: (data: { code: string; name: string; type: string; normalBalance: string; currency?: string; parentId?: string }) =>
    api.post("/api/finance/accounts", data),
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
    return api.get<ListResponse<Transaction>>(`/api/finance/transactions?${p.toString()}`)
  },
  getTransaction: (id: string) => api.get<Transaction>(`/api/finance/transactions/${id}`),
  createTransaction: (data: { txnType: string; txnDate?: string; description?: string; idempotencyKey?: string; entries: { accountId: string; type: string; amount: string; currency?: string }[] }) =>
    api.post<Transaction>("/api/finance/transactions", data),
  reverseTransaction: (id: string, reason: string) => api.post(`/api/finance/transactions/${id}/reverse`, { reason }),
  createApproval: (data: { refId: string; requestType: string; amount?: string; note?: string }) =>
    api.post<ApprovalRequest>("/api/finance/approvals", data),
  listPendingApprovals: (level?: number) =>
    api.get<{ approvals: ApprovalRequest[] }>(`/api/finance/approvals?level=${level || 1}`),
  getApproval: (id: string) => api.get<ApprovalRequest>(`/api/finance/approvals/${id}`),
  approveApproval: (id: string, note?: string) => api.post(`/api/finance/approvals/${id}/approve`, { note }),
  rejectApproval: (id: string, note?: string) => api.post(`/api/finance/approvals/${id}/reject`, { note }),
  cancelApproval: (id: string) => api.post(`/api/finance/approvals/${id}/cancel`),
  trialBalance: () => api.get<{ entries: { account: Account; balance: AccountBalance }[] }>("/api/finance/trial-balance"),
  
  // ── Calendar & Cut-off ──
  getCalendarStatus: (branchCode?: string) => api.get<SystemDate>(`/api/finance/calendar/status?branchCode=${branchCode || "HEAD_OFFICE"}`),
  triggerEOD: (branchCode?: string) => api.post<{ message: string; data: SystemDate }>(`/api/finance/calendar/eod?branchCode=${branchCode || "HEAD_OFFICE"}`),
  evaluateDate: (channel: string, type: string, time?: string) => {
    const p = buildSearchParams({ channel, type, time })
    return api.get<{ channel: string; type: string; executionTime: string; accountingDate: string }>(`/api/finance/calendar/evaluate?${p.toString()}`)
  },
  listHolidays: () => api.get<HolidayCalendar[]>("/api/finance/calendar/holidays"),
  addHoliday: (data: { date: string; description: string; isRecurring: boolean }) =>
    api.post<HolidayCalendar>("/api/finance/calendar/holidays", data),
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
