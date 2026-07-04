import { useFinancialListQuery } from "@workspace/core/query/list-query"
import { financeApi } from "@/features/finance/api"

export const trialBalanceKeys = {
  all: ["finance", "trial-balance"] as const,
  detail: () => [...trialBalanceKeys.all, "detail"] as const,
}

export function useTrialBalance() {
  return useFinancialListQuery({
    queryKey: trialBalanceKeys.detail(),
    queryFn: () => financeApi.trialBalance(),
    select: (res) => res.entries || [],
  })
}
