import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useListQuery } from "@workspace/core/query/list-query"
import { adminApi } from "@/features/iam"
import { roleKeys } from "@/features/iam/roles/queries"
import { userKeys } from "@/features/iam/users/queries"

export const groupKeys = {
  all: ["iam", "groups"] as const,
  list: (params: {
    page: number
    size: number
    search?: string
    status?: string
  }) => [...groupKeys.all, "list", params] as const,
  members: (groupId: string) => [...groupKeys.all, "members", groupId] as const,
  roles: (groupId: string) => [...groupKeys.all, "roles", groupId] as const,
}

export function useGroups(params: {
  page: number
  size: number
  search?: string
  status?: string
}) {
  return useListQuery({
    queryKey: groupKeys.list(params),
    queryFn: () => adminApi.listGroups(params),
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminApi.createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.all })
    },
  })
}

export function useUpdateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Parameters<typeof adminApi.updateGroup>[1]
    }) => adminApi.updateGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.all })
    },
  })
}

export function useDeleteGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminApi.deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.all })
    },
  })
}

export function useGroupMemberOptions(groupId?: string) {
  return useQuery({
    queryKey: groupId
      ? groupKeys.members(groupId)
      : ([...groupKeys.all, "members"] as const),
    queryFn: async () => {
      if (!groupId) return { users: [], members: [] }
      const [users, members] = await Promise.all([
        adminApi.listUsers({ page: 1, size: 100 }),
        adminApi.listGroupMembers(groupId),
      ])
      return { users: users.users, members: members.members }
    },
    enabled: Boolean(groupId),
  })
}

export function useSetGroupMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      groupId,
      userId,
      assigned,
    }: {
      groupId: string
      userId: string
      assigned: boolean
    }) =>
      assigned
        ? adminApi.removeGroupMember(groupId, userId)
        : adminApi.addGroupMember(groupId, userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.all })
      queryClient.invalidateQueries({
        queryKey: groupKeys.members(variables.groupId),
      })
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useGroupRoleOptions(groupId?: string) {
  return useQuery({
    queryKey: groupId
      ? groupKeys.roles(groupId)
      : ([...groupKeys.all, "roles"] as const),
    queryFn: async () => {
      if (!groupId) return { roles: [], groupRoles: [] }
      const [roles, groupRoles] = await Promise.all([
        adminApi.listRoles({ page: 1, size: 100 }),
        adminApi.listGroupRoles(groupId),
      ])
      return { roles: roles.roles, groupRoles: groupRoles.roles }
    },
    enabled: Boolean(groupId),
  })
}

export function useSetGroupRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      groupId,
      roleId,
      assigned,
    }: {
      groupId: string
      roleId: string
      assigned: boolean
    }) =>
      assigned
        ? adminApi.unassignGroupRole(groupId, roleId)
        : adminApi.assignGroupRole(groupId, roleId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.all })
      queryClient.invalidateQueries({
        queryKey: groupKeys.roles(variables.groupId),
      })
      queryClient.invalidateQueries({ queryKey: roleKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}
