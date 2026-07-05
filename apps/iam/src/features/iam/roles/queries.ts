import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useListQuery } from "@workspace/core/query/list-query"
import { adminApi } from "@/features/iam"
import { permissionKeys } from "@/features/iam/permissions/queries"

export const roleKeys = {
  all: ["iam", "roles"] as const,
  list: (params: { page: number; perPage: number; q?: string; status?: string }) =>
    [...roleKeys.all, "list", params] as const,
  permissions: (roleId: string) => [...roleKeys.all, "permissions", roleId] as const,
}

export function useRoles(params: { page: number; perPage: number; q?: string; status?: string }) {
  return useListQuery({
    queryKey: roleKeys.list(params),
    queryFn: () => adminApi.listRoles(params),
  })
}

export function useRolePermissionOptions(roleId?: string) {
  return useQuery({
    queryKey: roleId ? roleKeys.permissions(roleId) : [...roleKeys.all, "permissions"] as const,
    queryFn: async () => {
      if (!roleId) return { permissions: [], rolePermissions: [] }
      const [all, assigned] = await Promise.all([
        adminApi.listPermissions({ page: 1, perPage: 100 }),
        adminApi.listRolePermissions(roleId),
      ])
      return { permissions: all.items, rolePermissions: assigned.permissions }
    },
    enabled: Boolean(roleId),
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: adminApi.createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all })
    },
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: adminApi.deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all })
    },
  })
}

export function useSetRolePermission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      roleId,
      permissionId,
      assigned,
    }: {
      roleId: string
      permissionId: string
      assigned: boolean
    }) =>
      assigned
        ? adminApi.unassignRolePermission(roleId, permissionId)
        : adminApi.assignRolePermission(roleId, permissionId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.permissions(variables.roleId) })
      queryClient.invalidateQueries({ queryKey: permissionKeys.all })
    },
  })
}
