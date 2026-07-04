import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useFinancialListQuery } from "@workspace/core/query/list-query"
import { notify } from "@workspace/notifications/notify"
import { financeApi } from "@/features/finance/api"

export const approvalKeys = {
  all: ["finance", "approvals"] as const,
  pending: (level: number) => [...approvalKeys.all, "pending", level] as const,
}

export function usePendingApprovals(level: number) {
  return useFinancialListQuery({
    queryKey: approvalKeys.pending(level),
    queryFn: () => financeApi.listPendingApprovals(level),
    select: (res) => res.approvals || [],
  })
}

export function useCreateApproval() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof financeApi.createApproval>[0]) =>
      financeApi.createApproval(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all })
      notify.success("Approval request created")
    },
    onError: (error) => {
      notify.error(
        error instanceof Error
          ? error.message
          : "Could not create approval request"
      )
    },
  })
}

export function useApproveApproval() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      financeApi.approveApproval(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all })
      notify.success("Approval accepted")
    },
    onError: (error) => {
      notify.error(
        error instanceof Error ? error.message : "Could not approve request"
      )
    },
  })
}

export function useRejectApproval() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      financeApi.rejectApproval(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all })
      notify.success("Approval rejected")
    },
    onError: (error) => {
      notify.error(
        error instanceof Error ? error.message : "Could not reject request"
      )
    },
  })
}

export function useCancelApproval() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => financeApi.cancelApproval(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all })
      notify.success("Approval cancelled")
    },
    onError: (error) => {
      notify.error(
        error instanceof Error ? error.message : "Could not cancel approval"
      )
    },
  })
}
