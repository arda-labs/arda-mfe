import { api } from "@workspace/api"

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

export const adminApi = {
  // Users
  listUsers: (params?: {
    page?: number
    size?: number
    search?: string
    status?: string
    tenantId?: string
    sortField?: string
    sortOrder?: string
  }) => {
    const p = new URLSearchParams()
    if (params?.page) p.set("page", String(params.page))
    if (params?.size) p.set("size", String(params.size))
    if (params?.search) p.set("search", params.search)
    if (params?.status) p.set("status", params.status)
    if (params?.tenantId) p.set("tenantId", params.tenantId)
    if (params?.sortField) p.set("sortField", params.sortField)
    if (params?.sortOrder) p.set("sortOrder", params.sortOrder)
    return api
      .get<{
        items?: UserApiItem[]
        users: UserApiItem[]
        total: number
        page: number
        per_page?: number
        size: number
        totalPages: number
      }>(`/api/admin/users?${p.toString()}`)
      .then((res) => {
        const rows = res.items ?? res.users ?? []
        return {
          ...res,
          items: rows,
          users: rows.map((user) => ({
            ...user,
            roles: user.roles ?? [],
          })),
        }
      })
  },
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
  listGroups: (params?: {
    page?: number
    size?: number
    search?: string
    status?: string
    tenantId?: string
  }) => {
    const p = new URLSearchParams()
    if (params?.page) p.set("page", String(params.page))
    if (params?.size) p.set("size", String(params.size))
    if (params?.search) p.set("search", params.search)
    if (params?.status) p.set("status", params.status)
    if (params?.tenantId) p.set("tenantId", params.tenantId)
    return api
      .get<{
        items?: GroupApiItem[]
        groups: GroupApiItem[]
        total: number
        page?: number
        per_page?: number
        size?: number
        totalPages?: number
      }>(`/api/admin/groups?${p.toString()}`)
      .then((res) => {
        const rows = res.items ?? res.groups ?? []
        return { ...res, items: rows, groups: rows.map(normalizeGroup) }
      })
  },
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
      .get<{ items?: UserApiItem[]; members: UserApiItem[] }>(
        `/api/admin/groups/${id}/members`
      )
      .then((res) => {
        const rows = res.items ?? res.members ?? []
        return {
          items: rows,
          members: rows.map((user) => ({
            ...user,
            roles: user.roles ?? [],
          })),
        }
      }),
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
  listRoles: (params?: { page?: number; size?: number; search?: string; status?: string }) => {
    const p = new URLSearchParams()
    if (params?.page) p.set("page", String(params.page))
    if (params?.size) p.set("size", String(params.size))
    if (params?.search) p.set("search", params.search)
    if (params?.status) p.set("status", params.status)
    return api
      .get<{
        items?: RoleApiItem[]
        roles: RoleApiItem[]
        total: number
        page?: number
        per_page?: number
        size?: number
        totalPages?: number
      }>(`/api/admin/roles?${p.toString()}`)
      .then((res) => {
        const rows = res.items ?? res.roles ?? []
        return { ...res, items: rows, roles: rows.map(normalizeRole) }
      })
  },
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
  listPermissions: (params?: {
    page?: number
    size?: number
    module?: string
  }) => {
    const p = new URLSearchParams()
    if (params?.page) p.set("page", String(params.page))
    if (params?.size) p.set("size", String(params.size))
    if (params?.module) p.set("module", params.module)
    return api
      .get<{
        items?: PermissionApiItem[]
        permissions: PermissionApiItem[]
        total: number
        page?: number
        per_page?: number
        size?: number
        totalPages?: number
      }>(`/api/admin/permissions?${p.toString()}`)
      .then((res) => {
        const rows = res.items ?? res.permissions ?? []
        return { ...res, items: rows, permissions: rows.map(normalizePermission) }
      })
  },
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
