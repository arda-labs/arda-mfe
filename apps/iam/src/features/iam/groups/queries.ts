import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiClientError } from "@workspace/core/http/api-client"
import { ensureRecentAuth } from "@workspace/auth/ensure-recent-auth"
import { useListQuery } from "@workspace/core/query/list-query"
import { adminApi } from "@/features/iam"
import { roleKeys } from "@/features/iam/roles/queries"
import { userKeys } from "@/features/iam/users/queries"

export const groupKeys = {
  all: ["iam", "groups"] as const,
  list: (params: {
    page: number
    perPage: number
    q?: string
    status?: string
  }) => [...groupKeys.all, "list", params] as const,
  members: (groupId: string) => [...groupKeys.all, "members", groupId] as const,
  roles: (groupId: string) => [...groupKeys.all, "roles", groupId] as const,
}

export function useGroups(params: {
  page: number
  perPage: number
  q?: string
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

export function useGroupMembers(groupId?: string) {
  return useQuery({
    queryKey: groupId
      ? groupKeys.members(groupId)
      : ([...groupKeys.all, "members"] as const),
    queryFn: async () => {
      if (!groupId) return []
      const res = await adminApi.listGroupMembers(groupId)
      return res.items
    },
    enabled: Boolean(groupId),
  })
}

export function useGroupMemberPicker(
  enabled: boolean,
  params: { page: number; perPage: number; q?: string }
) {
  return useQuery({
    queryKey: [...groupKeys.all, "member-picker", params] as const,
    queryFn: () => adminApi.listUsers(params),
    enabled,
    placeholderData: keepPreviousData,
  })
}

export function useApplyGroupMembers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      groupId,
      toAdd,
      toRemove,
    }: {
      groupId: string
      toAdd: string[]
      toRemove: string[]
    }) => {
      if (toAdd.length === 0 && toRemove.length === 0) return
      const verified = await ensureRecentAuth()
      if (!verified) {
        throw new ApiClientError(
          "recent_auth_required",
          "recent_auth_required",
          403
        )
      }
      for (const userId of toRemove) {
        await adminApi.removeGroupMember(groupId, userId)
      }
      for (const userId of toAdd) {
        await adminApi.addGroupMember(groupId, userId)
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.all })
      queryClient.invalidateQueries({
        queryKey: groupKeys.members(variables.groupId),
      })
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
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

export function useGroupRoles(groupId?: string) {
  return useQuery({
    queryKey: groupId
      ? groupKeys.roles(groupId)
      : ([...groupKeys.all, "roles"] as const),
    queryFn: async () => {
      if (!groupId) return []
      const res = await adminApi.listGroupRoles(groupId)
      return res.roles
    },
    enabled: Boolean(groupId),
  })
}

export function useGroupRolePicker(q?: string) {
  return useQuery({
    queryKey: [...groupKeys.all, "role-picker", q ?? ""] as const,
    queryFn: () => adminApi.listRoles({ page: 1, perPage: 500, q }),
    placeholderData: keepPreviousData,
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
