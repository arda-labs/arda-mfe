import {
  deleteCanonical,
  getCanonical,
  postCanonical,
  putCanonical,
} from "@workspace/api"
import type { ListResponse } from "@workspace/api/list"
import { normalizeRole } from "../roles/api"
import type { RoleApiItem } from "../roles/types"
import {
  buildAdminListQuery,
  normalizeUser,
  targetPath,
  type AdminListInput,
} from "../users/api"
import type { UserApiItem } from "../users/types"
import type { Group, GroupApiItem } from "./types"

export const normalizeGroup = (group: GroupApiItem): Group => ({
  id: group.id,
  code: group.code,
  name: group.name,
  description: group.description,
  status: group.status,
  tenantId: group.tenant_id,
  isSystem: group.is_system,
  memberCount: group.member_count,
  roleCount: group.role_count,
  createdAt: group.created_at,
  updatedAt: group.updated_at,
})

function toCreateGroupBody(data: {
  code: string
  name: string
  description?: string
  status: string
  tenantId: string
}) {
  return {
    code: data.code,
    name: data.name,
    description: data.description,
    status: data.status,
    tenant_id: data.tenantId,
  }
}

function toUpdateGroupBody(data: {
  name?: string
  description?: string
  status?: string
  tenantId?: string
}) {
  const body: Record<string, unknown> = {}
  if (data.name !== undefined) body.name = data.name
  if (data.description !== undefined) body.description = data.description
  if (data.status !== undefined) body.status = data.status
  if (data.tenantId !== undefined) body.tenant_id = data.tenantId
  return body
}

export const groupsApi = {
  listGroups: (params?: AdminListInput) =>
    getCanonical<ListResponse<GroupApiItem>>(
      `/api/admin/groups?${buildAdminListQuery(params).toString()}`
    ).then((res) => ({
      ...res,
      items: res.items.map(normalizeGroup),
    })),
  getExportUrl: (params?: AdminListInput & { format?: string }) => {
    const query = buildAdminListQuery(params)
    if (params?.format) query.set("format", params.format)
    return `/api/admin/groups/export?${query.toString()}`
  },
  getGroup: (id: string, tenantId: string) =>
    getCanonical<{ group: GroupApiItem }>(
      targetPath(`/api/admin/groups/${id}`, tenantId)
    ).then((res) => ({ group: normalizeGroup(res.group) })),
  createGroup: (data: {
    code: string
    name: string
    description?: string
    status: string
    tenantId: string
  }) => postCanonical("/api/admin/groups", toCreateGroupBody(data)),
  updateGroup: (
    id: string,
    data: {
      name?: string
      description?: string
      status?: string
      tenantId: string
    }
  ) =>
    putCanonical(
      targetPath(`/api/admin/groups/${id}`, data.tenantId),
      toUpdateGroupBody(data)
    ),
  deleteGroup: (id: string, tenantId: string) =>
    deleteCanonical(targetPath(`/api/admin/groups/${id}`, tenantId)),
  listGroupMembers: (id: string, tenantId: string) =>
    getCanonical<{ items: UserApiItem[] }>(
      targetPath(`/api/admin/groups/${id}/members`, tenantId)
    ).then((res) => ({
      items: (res.items ?? []).map(normalizeUser),
    })),
  addGroupMember: (groupId: string, userId: string, tenantId: string) =>
    postCanonical(
      targetPath(`/api/admin/groups/${groupId}/members`, tenantId),
      { user_id: userId }
    ),
  removeGroupMember: (groupId: string, userId: string, tenantId: string) =>
    deleteCanonical(
      targetPath(`/api/admin/groups/${groupId}/members/${userId}`, tenantId)
    ),
  listGroupRoles: (id: string, tenantId: string) =>
    getCanonical<{ roles: RoleApiItem[] }>(
      targetPath(`/api/admin/groups/${id}/roles`, tenantId)
    ).then((res) => ({ roles: (res.roles ?? []).map(normalizeRole) })),
  assignGroupRole: (groupId: string, roleId: string, tenantId: string) =>
    postCanonical(
      targetPath(`/api/admin/groups/${groupId}/roles`, tenantId),
      { role_id: roleId }
    ),
  unassignGroupRole: (groupId: string, roleId: string, tenantId: string) =>
    deleteCanonical(
      targetPath(`/api/admin/groups/${groupId}/roles/${roleId}`, tenantId)
    ),
}
