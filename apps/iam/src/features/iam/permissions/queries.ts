import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useListQuery } from "@workspace/core/query/list-query"
import { adminApi } from "@/features/iam"

export const permissionKeys = {
  all: ["iam", "permissions"] as const,
  list: (params: { page: number; size: number; module?: string }) =>
    [...permissionKeys.all, "list", params] as const,
}

export function usePermissions(params: { page: number; size: number; module?: string }) {
  return useListQuery({
    queryKey: permissionKeys.list(params),
    queryFn: () => adminApi.listPermissions(params),
  })
}

export function useCreatePermission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: adminApi.createPermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.all })
    },
  })
}

export function useDeletePermission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: adminApi.deletePermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.all })
    },
  })
}
