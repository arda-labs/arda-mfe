import { api } from "@workspace/api"
import {
  buildListSearchParams,
  type ListResponse,
} from "@workspace/core/http/list-api"

export interface User {
  id: string
  username: string
  email: string
  name: string
  nickname?: string
  firstName?: string
  lastName?: string
  gender?: string
  country?: string
  address?: string
  position?: string
  status: string
  source?: string
  kratosIdentityId?: string
  roles: string[]
  tenantId: string
  createdAt: string
}

export interface IdentityConsistencyIssue {
  type: string
  userId?: string
  username?: string
  email?: string
  kratosIdentityId?: string
  mappingIdentityId?: string
  count?: number
}

export interface AdminUserSession {
  id: string
  deviceId?: string
  deviceName?: string
  deviceType?: string
  browser?: string
  os?: string
  ipAddress?: string
  userAgent?: string
  status?: string
  createdAt?: string
  lastSeenAt?: string
  expiresAt?: string
}

type UserApiItem = Omit<User, "roles"> & {
  roles?: string[]
}

export interface Role {
  id: string
  code: string
  name: string
  status: string
  permissions?: Permission[]
}

export interface Group {
  id: string
  code: string
  name: string
  description?: string
  status: string
  tenantId: string
  isSystem: boolean
  memberCount: number
  roleCount: number
  createdAt: string
  updatedAt: string
}

export interface Permission {
  id: string
  code: string
  name: string
  module: string
  resource: string
  operation: string
}

type RoleApiItem = Partial<Role> & {
  ID?: string
  Code?: string
  Name?: string
  Status?: string
  TenantID?: string
}

type PermissionApiItem = Partial<Permission> & {
  ID?: string
  Code?: string
  Name?: string
  Module?: string
  Resource?: string
  Operation?: string
}

type GroupApiItem = Partial<Group> & {
  ID?: string
  Code?: string
  Name?: string
  Description?: string
  Status?: string
  TenantID?: string
  IsSystem?: boolean
  MemberCount?: number
  RoleCount?: number
  CreatedAt?: string
  UpdatedAt?: string
}

const normalizeRole = (role: RoleApiItem): Role => ({
  id: role.id ?? role.ID ?? "",
  code: role.code ?? role.Code ?? "",
  name: role.name ?? role.Name ?? "",
  status: role.status ?? role.Status ?? "",
  permissions: role.permissions?.map(normalizePermission),
})

const normalizeGroup = (group: GroupApiItem): Group => ({
  id: group.id ?? group.ID ?? "",
  code: group.code ?? group.Code ?? "",
  name: group.name ?? group.Name ?? "",
  description: group.description ?? group.Description ?? "",
  status: group.status ?? group.Status ?? "",
  tenantId: group.tenantId ?? group.TenantID ?? "default",
  isSystem: group.isSystem ?? group.IsSystem ?? false,
  memberCount: group.memberCount ?? group.MemberCount ?? 0,
  roleCount: group.roleCount ?? group.RoleCount ?? 0,
  createdAt: group.createdAt ?? group.CreatedAt ?? "",
  updatedAt: group.updatedAt ?? group.UpdatedAt ?? "",
})

const normalizePermission = (permission: PermissionApiItem): Permission => ({
  id: permission.id ?? permission.ID ?? "",
  code: permission.code ?? permission.Code ?? "",
  name: permission.name ?? permission.Name ?? "",
  module: permission.module ?? permission.Module ?? "",
  resource: permission.resource ?? permission.Resource ?? "",
  operation: permission.operation ?? permission.Operation ?? "",
})

type AdminListInput = {
  page?: number
  size?: number
  perPage?: number
  search?: string
  q?: string
  sortField?: string
  sortOrder?: string
  status?: string
  tenantId?: string
  module?: string
}

function buildAdminListQuery(params?: AdminListInput): URLSearchParams {
  const order =
    params?.sortOrder === "desc"
      ? "desc"
      : params?.sortOrder
        ? "asc"
        : undefined
  return buildListSearchParams({
    page: params?.page,
    perPage: params?.perPage ?? params?.size,
    q: params?.q ?? params?.search,
    sort: params?.sortField,
    order,
    status: params?.status,
    tenantId: params?.tenantId,
    module: params?.module,
  })
}

export const adminApi = {
  // Users
  listUsers: (params?: AdminListInput) =>
    api
      .get<ListResponse<UserApiItem>>(
        `/api/admin/users?${buildAdminListQuery(params).toString()}`
      )
      .then((res) => ({
        ...res,
        items: res.items.map((user) => ({
          ...user,
          roles: user.roles ?? [],
        })),
      })),
  getUser: (id: string) => api.get<any>(`/api/admin/users/${id}`),
  createUser: (data: {
    username: string
    email: string
    password: string
    nickname?: string
    firstName?: string
    lastName?: string
    gender?: string
    country?: string
    address?: string
    position?: string
    tenantId?: string
    role_ids?: string[]
  }) => api.post("/api/admin/users", data),
  updateUser: (id: string, data: any) =>
    api.put(`/api/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/api/admin/users/${id}`),
  disableUser: (id: string) =>
    api.put(`/api/admin/users/${id}/status`, { status: "DISABLED" }),
  enableUser: (id: string) =>
    api.put(`/api/admin/users/${id}/status`, { status: "ACTIVE" }),
  resetUserPassword: (id: string, password: string) =>
    api.post<{ status: string }>(
      `/api/admin/users/${id}/identity/password/reset`,
      { password }
    ),
  provisionUserIdentity: (id: string, temporaryPassword: string) =>
    api.post<{ status: string; kratosIdentityId: string }>(
      `/api/admin/users/${id}/identity/provision`,
      { temporaryPassword }
    ),
  auditIdentityConsistency: () =>
    api.get<{ ok: boolean; count: number; issues: IdentityConsistencyIssue[] }>(
      "/api/admin/identity/consistency"
    ),
  listUserSessions: (id: string) =>
    api.get<{ sessions: AdminUserSession[] }>(
      `/api/admin/users/${id}/sessions`
    ),
  revokeUserSessions: (id: string, reason = "admin_revoked") =>
    api.delete<{ status: string; count: number }>(
      `/api/admin/users/${id}/sessions?reason=${encodeURIComponent(reason)}`
    ),

  // Groups
  listGroups: (params?: AdminListInput) =>
    api
      .get<ListResponse<GroupApiItem>>(
        `/api/admin/groups?${buildAdminListQuery(params).toString()}`
      )
      .then((res) => ({
        ...res,
        items: res.items.map(normalizeGroup),
      })),
  getGroup: (id: string) =>
    api
      .get<{ group: GroupApiItem }>(`/api/admin/groups/${id}`)
      .then((res) => ({ group: normalizeGroup(res.group) })),
  createGroup: (data: {
    code: string
    name: string
    description?: string
    status: string
    tenantId: string
  }) => api.post("/api/admin/groups", data),
  updateGroup: (
    id: string,
    data: {
      name?: string
      description?: string
      status?: string
      tenantId?: string
    }
  ) => api.put(`/api/admin/groups/${id}`, data),
  deleteGroup: (id: string) => api.delete(`/api/admin/groups/${id}`),
  listGroupMembers: (id: string) =>
    api
      .get<{ items: UserApiItem[] }>(`/api/admin/groups/${id}/members`)
      .then((res) => ({
        items: (res.items ?? []).map((user) => ({
          ...user,
          roles: user.roles ?? [],
        })),
      })),
  addGroupMember: (groupId: string, userId: string) =>
    api.post(`/api/admin/groups/${groupId}/members`, { user_id: userId }),
  removeGroupMember: (groupId: string, userId: string) =>
    api.delete(`/api/admin/groups/${groupId}/members/${userId}`),
  listGroupRoles: (id: string) =>
    api
      .get<{ roles: RoleApiItem[] }>(`/api/admin/groups/${id}/roles`)
      .then((res) => ({ roles: (res.roles ?? []).map(normalizeRole) })),
  assignGroupRole: (groupId: string, roleId: string) =>
    api.post(`/api/admin/groups/${groupId}/roles`, { role_id: roleId }),
  unassignGroupRole: (groupId: string, roleId: string) =>
    api.delete(`/api/admin/groups/${groupId}/roles/${roleId}`),

  // Roles
  listRoles: (params?: AdminListInput) =>
    api
      .get<ListResponse<RoleApiItem>>(
        `/api/admin/roles?${buildAdminListQuery(params).toString()}`
      )
      .then((res) => ({
        ...res,
        items: res.items.map(normalizeRole),
      })),
  getRole: (id: string) =>
    api
      .get<{ role: RoleApiItem; permissions: PermissionApiItem[] }>(
        `/api/admin/roles/${id}`
      )
      .then((res) => ({
        role: normalizeRole(res.role),
        permissions: (res.permissions ?? []).map(normalizePermission),
      })),
  createRole: (data: { code: string; name: string }) =>
    api.post("/api/admin/roles", data),
  updateRole: (id: string, data: { name?: string }) =>
    api.put(`/api/admin/roles/${id}`, data),
  deleteRole: (id: string) => api.delete(`/api/admin/roles/${id}`),
  listRolePermissions: (roleId: string) =>
    api
      .get<{ permissions: PermissionApiItem[] }>(
        `/api/admin/roles/${roleId}/permissions`
      )
      .then((res) => ({
        permissions: (res.permissions ?? []).map(normalizePermission),
      })),
  assignRolePermission: (roleId: string, permissionId: string) =>
    api.post(`/api/admin/roles/${roleId}/permissions/assign`, {
      permission_id: permissionId,
    }),
  unassignRolePermission: (roleId: string, permissionId: string) =>
    api.delete(`/api/admin/roles/${roleId}/permissions/${permissionId}`),

  // Permissions
  listPermissions: (params?: AdminListInput) =>
    api
      .get<ListResponse<PermissionApiItem>>(
        `/api/admin/permissions?${buildAdminListQuery(params).toString()}`
      )
      .then((res) => ({
        ...res,
        items: res.items.map(normalizePermission),
      })),
  createPermission: (data: {
    code: string
    name: string
    module: string
    resource: string
    operation: string
  }) => api.post("/api/admin/permissions", data),
  deletePermission: (id: string) => api.delete(`/api/admin/permissions/${id}`),

  // Role assignments
  assignRole: (userId: string, roleId: string) =>
    api.post(`/api/admin/users/${userId}/roles`, { role_id: roleId }),
  unassignRole: (userId: string, roleId: string) =>
    api.delete(`/api/admin/users/${userId}/roles/${roleId}`),
}
