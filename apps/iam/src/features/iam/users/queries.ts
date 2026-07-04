import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useListQuery } from "@workspace/core/query/list-query"
import { adminApi } from "@/features/iam"
import { roleKeys } from "@/features/iam/roles/queries"

export const userKeys = {
  all: ["iam", "users"] as const,
  list: (params: {
    page: number
    size: number
    search?: string
    status?: string
    sortField?: string
    sortOrder?: string
  }) => [...userKeys.all, "list", params] as const,
  sessions: (userId: string) => [...userKeys.all, "sessions", userId] as const,
}

export function useUsers(params: {
  page: number
  size: number
  search?: string
  status?: string
  sortField?: string
  sortOrder?: string
}) {
  return useListQuery({
    queryKey: userKeys.list(params),
    queryFn: () => adminApi.listUsers(params),
  })
}

export function useRoleOptions(enabled: boolean) {
  return useQuery({
    queryKey: roleKeys.list({ page: 1, size: 100 }),
    queryFn: () => adminApi.listRoles({ page: 1, size: 100 }),
    enabled,
  })
}

export function useUserSessions(userId?: string) {
  return useQuery({
    queryKey: userId ? userKeys.sessions(userId) : [...userKeys.all, "sessions"] as const,
    queryFn: () => (userId ? adminApi.listUserSessions(userId) : Promise.resolve({ sessions: [] })),
    enabled: Boolean(userId),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof adminApi.updateUser>[1] }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useSetUserStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "DISABLED" }) =>
      status === "ACTIVE" ? adminApi.enableUser(id) : adminApi.disableUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useSetUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, roleId, assigned }: { userId: string; roleId: string; assigned: boolean }) =>
      assigned ? adminApi.unassignRole(userId, roleId) : adminApi.assignRole(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      adminApi.resetUserPassword(id, password),
  })
}

export function useProvisionUserIdentity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, temporaryPassword }: { id: string; temporaryPassword: string }) =>
      adminApi.provisionUserIdentity(id, temporaryPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useAuditIdentityConsistency() {
  return useMutation({
    mutationFn: adminApi.auditIdentityConsistency,
  })
}

export function useRevokeUserSessions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => adminApi.revokeUserSessions(userId),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: userKeys.sessions(userId) })
    },
  })
}
