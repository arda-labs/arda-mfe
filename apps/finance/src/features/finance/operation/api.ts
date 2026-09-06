import { api, type ApiSuccess } from "@workspace/api"
import type { ListResponse } from "@workspace/api/list"

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

export const financeOperationApi = {
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
