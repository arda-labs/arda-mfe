import { useQuery } from "@tanstack/react-query"
import { financeApi } from "@/features/finance/api"

export const trialBalanceKeys = {
  all: ["finance", "trial-balance"] as const,
  detail: () => [...trialBalanceKeys.all, "detail"] as const,
}

export function useTrialBalance() {
  return useQuery({
    queryKey: trialBalanceKeys.detail(),
    queryFn: () => financeApi.trialBalance(),
    select: (res) => res.entries || [],
  })
}
