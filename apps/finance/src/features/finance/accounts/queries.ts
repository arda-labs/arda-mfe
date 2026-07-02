import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { notify } from "@workspace/notifications/notify"
import { financeApi } from "@/features/finance/api"

export const accountKeys = {
  all: ["finance", "accounts"] as const,
  list: () => [...accountKeys.all, "list"] as const,
}

export function useAccounts() {
  return useQuery({
    queryKey: accountKeys.list(),
    queryFn: () => financeApi.listAccounts(),
    select: (res) => res.accounts,
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof financeApi.createAccount>[0]) =>
      financeApi.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all })
      notify.success("Account created")
    },
    onError: (error) => {
      notify.error(
        error instanceof Error ? error.message : "Could not create account"
      )
    },
  })
}
