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

const normalizeRole = (role: RoleApiItem): Role => ({
  id: role.id ?? role.ID ?? "",
  code: role.code ?? role.Code ?? "",
  name: role.name ?? role.Name ?? "",
  status: role.status ?? role.Status ?? "",
  permissions: role.permissions?.map(normalizePermission),
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
    return api.get<{users: UserApiItem[]; total: number; page: number; size: number; totalPages: number}>(`/api/admin/users?${p.toString()}`)
      .then((res) => ({
        ...res,
        users: res.users.map((user) => ({
          ...user,
          roles: user.roles ?? [],
        })),
      }))
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
  }) =>
    api.post("/api/admin/users", data),
  updateUser: (id: string, data: any) => api.put(`/api/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/api/admin/users/${id}`),
  disableUser: (id: string) => api.put(`/api/admin/users/${id}/status`, { status: "DISABLED" }),
  enableUser: (id: string) => api.put(`/api/admin/users/${id}/status`, { status: "ACTIVE" }),
  resetUserPassword: (id: string, password: string) =>
    api.post<{ status: string }>(`/api/admin/users/${id}/identity/password/reset`, { password }),
  provisionUserIdentity: (id: string, temporaryPassword: string) =>
    api.post<{ status: string; kratosIdentityId: string }>(`/api/admin/users/${id}/identity/provision`, { temporaryPassword }),
  auditIdentityConsistency: () =>
    api.get<{ ok: boolean; count: number; issues: IdentityConsistencyIssue[] }>("/api/admin/identity/consistency"),
  listUserSessions: (id: string) =>
    api.get<{ sessions: AdminUserSession[] }>(`/api/admin/users/${id}/sessions`),
  revokeUserSessions: (id: string, reason = "admin_revoked") =>
    api.delete<{ status: string; count: number }>(`/api/admin/users/${id}/sessions?reason=${encodeURIComponent(reason)}`),

  // Roles
  listRoles: (params?: {page?: number; size?: number; search?: string}) => {
    const p = new URLSearchParams()
    if (params?.page) p.set("page", String(params.page))
    if (params?.size) p.set("size", String(params.size))
    if (params?.search) p.set("search", params.search)
    return api.get<{roles: RoleApiItem[]; total: number; page?: number; size?: number; totalPages?: number}>( `/api/admin/roles?${p.toString()}`)
      .then((res) => ({
        ...res,
        roles: res.roles.map(normalizeRole),
      }))
  },
  getRole: (id: string) =>
    api.get<{role: RoleApiItem; permissions: PermissionApiItem[]}>(`/api/admin/roles/${id}`)
      .then((res) => ({
        role: normalizeRole(res.role),
        permissions: (res.permissions ?? []).map(normalizePermission),
      })),
  createRole: (data: {code: string; name: string}) => api.post("/api/admin/roles", data),
  updateRole: (id: string, data: {name?: string}) => api.put(`/api/admin/roles/${id}`, data),
  deleteRole: (id: string) => api.delete(`/api/admin/roles/${id}`),
  listRolePermissions: (roleId: string) =>
    api.get<{permissions: PermissionApiItem[]}>(`/api/admin/roles/${roleId}/permissions`)
      .then((res) => ({ permissions: (res.permissions ?? []).map(normalizePermission) })),
  assignRolePermission: (roleId: string, permissionId: string) =>
    api.post(`/api/admin/roles/${roleId}/permissions/assign`, { permission_id: permissionId }),
  unassignRolePermission: (roleId: string, permissionId: string) =>
    api.delete(`/api/admin/roles/${roleId}/permissions/${permissionId}`),

  // Permissions
  listPermissions: (params?: {page?: number; size?: number; module?: string}) => {
    const p = new URLSearchParams()
    if (params?.page) p.set("page", String(params.page))
    if (params?.size) p.set("size", String(params.size))
    if (params?.module) p.set("module", params.module)
    return api.get<{permissions: PermissionApiItem[]; total: number; page?: number; size?: number; totalPages?: number}>(`/api/admin/permissions?${p.toString()}`)
      .then((res) => ({
        ...res,
        permissions: res.permissions.map(normalizePermission),
      }))
  },
  createPermission: (data: {code: string; name: string; module: string; resource: string; operation: string}) =>
    api.post("/api/admin/permissions", data),
  deletePermission: (id: string) => api.delete(`/api/admin/permissions/${id}`),

  // Role assignments
  assignRole: (userId: string, roleId: string) =>
    api.post(`/api/admin/users/${userId}/roles`, { role_id: roleId }),
  unassignRole: (userId: string, roleId: string) =>
    api.delete(`/api/admin/users/${userId}/roles/${roleId}`),
}
