import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useFinancialListQuery } from "@workspace/core/query/list-query"
import { notify } from "@workspace/notifications/notify"
import { financeApi } from "@/features/finance/api"

interface TransactionListParams {
  page: number
  size: number
}

export const transactionKeys = {
  all: ["finance", "transactions"] as const,
  list: (params: TransactionListParams) =>
    [...transactionKeys.all, "list", params] as const,
}

export function useTransactions(params: TransactionListParams) {
  return useFinancialListQuery({
    queryKey: transactionKeys.list(params),
    queryFn: () => financeApi.listTransactions(params),
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof financeApi.createTransaction>[0]) =>
      financeApi.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
      notify.success("Transaction posted")
    },
    onError: (error) => {
      notify.error(
        error instanceof Error ? error.message : "Could not post transaction"
      )
    },
  })
}
