import { useFinancialListQuery } from "@workspace/core/query/list-query"
import {
  financeOperationApi,
  type FinanceOperation,
  type FinanceTransactionSearchParams,
  type OperationView,
} from "./api"

export const financeOperationKeys = {
  all: ["finance", "operation"] as const,
  cases: (operation: FinanceOperation, view: OperationView) =>
    [...financeOperationKeys.all, "cases", operation, view] as const,
  search: (params: FinanceTransactionSearchParams) =>
    [...financeOperationKeys.all, "search", params] as const,
  accountingConfig: () =>
    [...financeOperationKeys.all, "accounting-config"] as const,
}

export function useFinanceOperationCases(
  operation: FinanceOperation,
  view: OperationView
) {
  return useFinancialListQuery({
    queryKey: financeOperationKeys.cases(operation, view),
    queryFn: () => financeOperationApi.listCases(operation, view),
  })
}

export function useFinanceTransactionSearch(
  params: FinanceTransactionSearchParams
) {
  return useFinancialListQuery({
    queryKey: financeOperationKeys.search(params),
    queryFn: () => financeOperationApi.searchTransactions(params),
  })
}

export function useAccountingConfig() {
  return useFinancialListQuery({
    queryKey: financeOperationKeys.accountingConfig(),
    queryFn: () => financeOperationApi.listAccountingConfig(),
  })
}
