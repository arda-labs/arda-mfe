import { api } from "@workspace/api"
import { ApiClientError } from "@workspace/core/http/api-client"

export type FinanceOperation = "incoming" | "outgoing"
export type OperationView =
  "all" | "mine" | "in_progress" | "overdue" | "completed" | "suspended"
export type FinanceOperationSource = "api" | "mock"

export interface FinanceOperationCase {
  id: string
  caseCode: string
  operation: FinanceOperation
  primaryObject: string
  counterparty: string
  amount: string
  currency: string
  channel: string
  status: string
  currentStep: string
  assignee?: string
  candidateRole: string
  slaDueAt: string
  slaState: "ON_TIME" | "DUE_SOON" | "OVERDUE" | "DONE"
  priority: "LOW" | "NORMAL" | "HIGH"
  createdAt: string
  updatedAt: string
  quickAction: string
}

export interface FinanceTransactionSearchParams {
  keyword: string
  direction: "ALL" | "INCOMING" | "OUTGOING"
  status: string
  from: string
  to: string
}

export interface AccountingConfigItem {
  id: string
  group: "process" | "classification" | "journal" | "regulatory" | "internal"
  code: string
  name: string
  owner: string
  status: string
  updatedAt: string
}

export interface OperationResult<T> {
  items: T[]
  source: FinanceOperationSource
}

interface FinanceTransaction {
  id: string
  direction?: "INCOMING" | "OUTGOING"
  caseType?: string
  operationName?: string
  txnType: string
  status: string
  amount?: string
  currency?: string
  description?: string
  sourceRef?: string
  counterpartyName?: string
  counterpartyAccount?: string
  currentStep?: string
  priority?: "LOW" | "NORMAL" | "HIGH" | string
  postedAt?: string
  createdAt: string
}

const mockCases: FinanceOperationCase[] = [
  {
    id: "fin-in-001",
    caseCode: "FIN-IN-20260702-001",
    operation: "incoming",
    primaryObject: "Thu tiền chuyển khoản khách hàng",
    counterparty: "Công ty Minh An",
    amount: "125000000",
    currency: "VND",
    channel: "Bank transfer",
    status: "IN_REVIEW",
    currentStep: "Phân loại tài khoản",
    assignee: "Tôi",
    candidateRole: "FINANCE_TXN_MAKER",
    slaDueAt: "2026-07-02T16:30:00+07:00",
    slaState: "DUE_SOON",
    priority: "HIGH",
    createdAt: "2026-07-02T09:10:00+07:00",
    updatedAt: "2026-07-02T11:25:00+07:00",
    quickAction: "Tiếp tục xử lý",
  },
  {
    id: "fin-in-002",
    caseCode: "FIN-IN-20260701-018",
    operation: "incoming",
    primaryObject: "Nộp tiền đối soát POS",
    counterparty: "CN Đà Nẵng",
    amount: "48250000",
    currency: "VND",
    channel: "POS settlement",
    status: "PENDING_APPROVAL",
    currentStep: "Duyệt bút toán",
    candidateRole: "FINANCE_TXN_CHECKER",
    slaDueAt: "2026-07-02T10:00:00+07:00",
    slaState: "OVERDUE",
    priority: "NORMAL",
    createdAt: "2026-07-01T15:05:00+07:00",
    updatedAt: "2026-07-02T08:45:00+07:00",
    quickAction: "Nhận xử lý",
  },
  {
    id: "fin-out-001",
    caseCode: "FIN-OUT-20260702-004",
    operation: "outgoing",
    primaryObject: "Chi hoàn tiền khách hàng",
    counterparty: "Nguyễn Hoàng Nam",
    amount: "8500000",
    currency: "VND",
    channel: "Payment order",
    status: "SUBMITTED",
    currentStep: "Kiểm tra người nhận",
    assignee: "Tôi",
    candidateRole: "FINANCE_TXN_MAKER",
    slaDueAt: "2026-07-03T09:00:00+07:00",
    slaState: "ON_TIME",
    priority: "NORMAL",
    createdAt: "2026-07-02T10:20:00+07:00",
    updatedAt: "2026-07-02T10:40:00+07:00",
    quickAction: "Bổ sung phí",
  },
  {
    id: "fin-out-002",
    caseCode: "FIN-OUT-20260630-011",
    operation: "outgoing",
    primaryObject: "Thanh toán phí đối tác",
    counterparty: "PartnerPay",
    amount: "67000000",
    currency: "VND",
    channel: "Internal settlement",
    status: "COMPLETED",
    currentStep: "Hoàn tất",
    candidateRole: "FINANCE_TXN_CHECKER",
    slaDueAt: "2026-07-01T17:00:00+07:00",
    slaState: "DONE",
    priority: "LOW",
    createdAt: "2026-06-30T14:00:00+07:00",
    updatedAt: "2026-07-01T16:10:00+07:00",
    quickAction: "Xem hồ sơ",
  },
]

const mockAccountingConfig: AccountingConfigItem[] = [
  {
    id: "cfg-process-in",
    group: "process",
    code: "FINANCE_INCOMING_TRANSACTION",
    name: "Giao dịch đến",
    owner: "finance-service + workflow-service",
    status: "Đang áp dụng",
    updatedAt: "2026-07-02",
  },
  {
    id: "cfg-classification-pos",
    group: "classification",
    code: "CLS-POS-SETTLEMENT",
    name: "Phân loại tài khoản đối soát POS",
    owner: "finance-service",
    status: "Nháp",
    updatedAt: "2026-07-01",
  },
  {
    id: "cfg-journal-transfer",
    group: "journal",
    code: "JRN-CASH-IN",
    name: "Bút toán thu tiền chuyển khoản",
    owner: "finance-service",
    status: "Đang áp dụng",
    updatedAt: "2026-06-28",
  },
  {
    id: "cfg-regulatory-vnd",
    group: "regulatory",
    code: "REG-VND-CLEARING",
    name: "Tài khoản quy định thanh toán VND",
    owner: "finance-service",
    status: "Đang áp dụng",
    updatedAt: "2026-06-21",
  },
  {
    id: "cfg-internal-fee",
    group: "internal",
    code: "INT-FEE-SUSPENSE",
    name: "Tài khoản treo phí nội bộ",
    owner: "finance-service",
    status: "Cần rà soát",
    updatedAt: "2026-06-18",
  },
]

export const financeOperationApi = {
  async listCases(
    operation: FinanceOperation,
    view: OperationView
  ): Promise<OperationResult<FinanceOperationCase>> {
    const p = new URLSearchParams()
    p.set("size", "100")

    try {
      const data = await api.get<
        | FinanceTransaction[]
        | { transactions?: FinanceTransaction[]; items?: FinanceTransaction[] }
      >(`/api/finance/${operation}-transactions?${p.toString()}`)
      const items = normalizeItems(data, "transactions").map(caseFromTransaction)
      return {
        items: filterCases(items, operation, view),
        source: "api",
      }
    } catch (error) {
      if (!isMissingEndpoint(error)) throw error
      return {
        items: filterCases(mockCases, operation, view),
        source: "mock",
      }
    }
  },

  async searchTransactions(
    params: FinanceTransactionSearchParams
  ): Promise<OperationResult<FinanceOperationCase>> {
    const p = new URLSearchParams()
    if (params.keyword) p.set("keyword", params.keyword)
    if (params.direction !== "ALL") p.set("direction", params.direction)
    if (params.status !== "ALL") p.set("status", params.status)
    if (params.from) p.set("from", params.from)
    if (params.to) p.set("to", params.to)

    try {
      const data = await api.get<
        | FinanceTransaction[]
        | { transactions?: FinanceTransaction[]; items?: FinanceTransaction[] }
      >(`/api/finance/transactions/search?${p.toString()}`)
      return {
        items: normalizeItems(data, "transactions").map(caseFromTransaction),
        source: "api",
      }
    } catch (error) {
      if (!isMissingEndpoint(error)) throw error
      return { items: searchMockCases(params), source: "mock" }
    }
  },

  async listAccountingConfig(): Promise<OperationResult<AccountingConfigItem>> {
    try {
      const [
        processConfigs,
        classifications,
        journalDefinitions,
        regulatoryAccounts,
        internalAccounts,
      ] = await Promise.all([
        api.get<{ processConfigs?: Record<string, string>[] }>(
          "/api/finance/accounting/process-configs"
        ),
        api.get<{ accountClassifications?: Record<string, string>[] }>(
          "/api/finance/accounting/account-classifications"
        ),
        api.get<{ journalDefinitions?: Record<string, string>[] }>(
          "/api/finance/accounting/journal-definitions"
        ),
        api.get<{ regulatoryAccounts?: Record<string, string>[] }>(
          "/api/finance/accounting/regulatory-accounts"
        ),
        api.get<{ internalAccounts?: Record<string, string>[] }>(
          "/api/finance/accounting/internal-accounts"
        ),
      ])
      return {
        items: [
          ...(processConfigs.processConfigs ?? []).map((item) =>
            configItem("process", item)
          ),
          ...(classifications.accountClassifications ?? []).map((item) =>
            configItem("classification", item)
          ),
          ...(journalDefinitions.journalDefinitions ?? []).map((item) =>
            configItem("journal", item)
          ),
          ...(regulatoryAccounts.regulatoryAccounts ?? []).map((item) =>
            configItem("regulatory", item)
          ),
          ...(internalAccounts.internalAccounts ?? []).map((item) =>
            configItem("internal", item)
          ),
        ],
        source: "api",
      }
    } catch (error) {
      if (!isMissingEndpoint(error)) throw error
      return { items: mockAccountingConfig, source: "mock" }
    }
  },
}

function normalizeItems<T>(
  data: T[] | Record<string, T[] | undefined>,
  key: string
) {
  if (Array.isArray(data)) return data
  return data.items ?? data[key] ?? []
}

function caseFromTransaction(item: FinanceTransaction): FinanceOperationCase {
  const operation = item.direction === "OUTGOING" ? "outgoing" : "incoming"
  const createdAt = item.createdAt || item.postedAt || new Date().toISOString()

  return {
    id: item.id,
    caseCode: item.sourceRef || item.id,
    operation,
    primaryObject: item.description || item.txnType,
    counterparty: item.counterpartyName || item.counterpartyAccount || "-",
    amount: item.amount ?? "0",
    currency: item.currency ?? "VND",
    channel: item.operationName || item.txnType,
    status: item.status,
    currentStep: item.currentStep || item.status,
    candidateRole: "FINANCE_TXN_MAKER",
    slaDueAt: item.postedAt || createdAt,
    slaState:
      item.status === "POSTED" || item.status === "COMPLETED"
        ? "DONE"
        : "ON_TIME",
    priority: priority(item.priority),
    createdAt,
    updatedAt: item.postedAt || createdAt,
    quickAction: "Mở hồ sơ",
  }
}

function configItem(
  group: AccountingConfigItem["group"],
  item: Record<string, string>
): AccountingConfigItem {
  return {
    id: item.id ?? item.code,
    group,
    code: item.code ?? item.caseType ?? item.accountCode ?? "-",
    name: item.name ?? item.operationName ?? item.purpose ?? "-",
    owner: item.ownerService ?? "finance-service",
    status: item.status ?? "ACTIVE",
    updatedAt: item.updatedAt ?? "",
  }
}

function priority(value: string | undefined): FinanceOperationCase["priority"] {
  if (value === "LOW" || value === "HIGH") return value
  return "NORMAL"
}

function isMissingEndpoint(error: unknown) {
  return error instanceof ApiClientError && error.status === 404
}

function filterCases(
  cases: FinanceOperationCase[],
  operation: FinanceOperation,
  view: OperationView
) {
  const scoped = cases.filter((item) => item.operation === operation)
  if (view === "mine") return scoped.filter((item) => item.assignee === "Tôi")
  if (view === "in_progress")
    return scoped.filter((item) =>
      ["SUBMITTED", "IN_REVIEW", "PENDING_APPROVAL"].includes(item.status)
    )
  if (view === "overdue")
    return scoped.filter((item) => item.slaState === "OVERDUE")
  if (view === "completed")
    return scoped.filter((item) => item.status === "COMPLETED")
  if (view === "suspended")
    return scoped.filter((item) =>
      ["FAILED", "SUSPENDED", "CANCELLED"].includes(item.status)
    )
  return scoped
}

function searchMockCases(params: FinanceTransactionSearchParams) {
  const keyword = params.keyword.trim().toLowerCase()

  return mockCases.filter((item) => {
    const matchesKeyword =
      !keyword ||
      item.caseCode.toLowerCase().includes(keyword) ||
      item.primaryObject.toLowerCase().includes(keyword) ||
      item.counterparty.toLowerCase().includes(keyword)
    const matchesDirection =
      params.direction === "ALL" ||
      (params.direction === "INCOMING" && item.operation === "incoming") ||
      (params.direction === "OUTGOING" && item.operation === "outgoing")
    const matchesStatus =
      params.status === "ALL" || item.status === params.status
    const createdDate = item.createdAt.slice(0, 10)
    const matchesFrom = !params.from || createdDate >= params.from
    const matchesTo = !params.to || createdDate <= params.to

    return (
      matchesKeyword &&
      matchesDirection &&
      matchesStatus &&
      matchesFrom &&
      matchesTo
    )
  })
}
