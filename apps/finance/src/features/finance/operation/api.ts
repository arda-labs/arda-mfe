import { api, type ApiSuccess } from "@workspace/api"
import type { ListResponse } from "@workspace/api/list"
import { buildSearchParams } from "@workspace/api/query"

export type FinanceOperation = "incoming" | "outgoing"
export type OperationView =
  "all" | "mine" | "in_progress" | "overdue" | "completed" | "suspended"

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

export type OperationResult<T> = {
  items: T[]
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


export const financeOperationApi = {
  async listCases(
    operation: FinanceOperation,
    view: OperationView
  ): Promise<OperationResult<FinanceOperationCase>> {
    const p = buildSearchParams({ per_page: 100 })

    const data = await api.get<ApiSuccess<ListResponse<FinanceTransaction>>>(
      `/api/finance/${operation}-transactions?${p.toString()}`
    )
    const items = data.result.items.map(caseFromTransaction)
    return { items: filterCases(items, operation, view) }
  },

  async searchTransactions(
    params: FinanceTransactionSearchParams
  ): Promise<OperationResult<FinanceOperationCase>> {
    const p = buildSearchParams({
      keyword: params.keyword,
      direction: params.direction === "ALL" ? undefined : params.direction,
      status: params.status === "ALL" ? undefined : params.status,
      from: params.from,
      to: params.to,
    })

    const data = await api.get<ApiSuccess<ListResponse<FinanceTransaction>>>(
      `/api/finance/transactions/search?${p.toString()}`
    )
    return { items: data.result.items.map(caseFromTransaction) }
  },

  async listAccountingConfig(): Promise<OperationResult<AccountingConfigItem>> {
    const [processConfigs, classifications, journalDefinitions, regulatoryAccounts, internalAccounts] =
      await Promise.all([
        api.get<ApiSuccess<ListResponse<Record<string, string>>>>(
          "/api/finance/accounting/process-configs"
        ),
        api.get<ApiSuccess<ListResponse<Record<string, string>>>>(
          "/api/finance/accounting/account-classifications"
        ),
        api.get<ApiSuccess<ListResponse<Record<string, string>>>>(
          "/api/finance/accounting/journal-definitions"
        ),
        api.get<ApiSuccess<ListResponse<Record<string, string>>>>(
          "/api/finance/accounting/regulatory-accounts"
        ),
        api.get<ApiSuccess<ListResponse<Record<string, string>>>>(
          "/api/finance/accounting/internal-accounts"
        ),
      ])
    return {
      items: [
        ...processConfigs.result.items.map((item) => configItem("process", item)),
        ...classifications.result.items.map((item) =>
          configItem("classification", item)
        ),
        ...journalDefinitions.result.items.map((item) =>
          configItem("journal", item)
        ),
        ...regulatoryAccounts.result.items.map((item) =>
          configItem("regulatory", item)
        ),
        ...internalAccounts.result.items.map((item) =>
          configItem("internal", item)
        ),
      ],
    }
  },
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
