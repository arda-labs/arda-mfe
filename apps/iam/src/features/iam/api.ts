import { api, type ApiSuccess } from "@workspace/api"
import { buildListSearchParams, type ListResponse } from "@workspace/api/list"
import { buildSearchParams } from "@workspace/api/query"
import type { IamPermission } from "@workspace/api/generated/iam-v1"

// ── Audit ────────────────────────────────────────────

export interface AuditEvent {
  id: string
  eventType: string
  subject: string
  action: string
  resource: string
  result: string
  details: Record<string, unknown>
  clientIp: string
  userAgent: string
  requestId: string
  serviceName: string
  timestamp: string
}

type AuditEventApiItem = {
  id: string
  event_type: string
  subject: string
  action: string
  resource: string
  result: string
  details: Record<string, unknown>
  client_ip: string
  user_agent: string
  request_id: string
  service_name: string
  timestamp: string
}

export interface AuditStats {
  totalEvents: number
  byEventType: Record<string, number>
  byResult: Record<string, number>
  loginSuccess: number
  loginFailure: number
  from: string
  to: string
}

export interface ChainVerification {
  valid: boolean
  total: number
  tampered?: string[]
}

const normalizeAuditEvent = (event: AuditEventApiItem): AuditEvent => ({
  id: event.id,
  eventType: event.event_type,
  subject: event.subject,
  action: event.action,
  resource: event.resource,
  result: event.result,
  details: event.details,
  clientIp: event.client_ip,
  userAgent: event.user_agent,
  requestId: event.request_id,
  serviceName: event.service_name,
  timestamp: event.timestamp,
})

export const auditApi = {
  query: (params?: {
    event_type?: string[]
    subject?: string
    result?: string
    from?: string
    to?: string
    page?: number
    perPage?: number
    sort?: string
  }) => {
    const p = buildListSearchParams({
      page: params?.page,
      perPage: params?.perPage,
      sort: params?.sort,
    })
    if (params?.event_type)
      params.event_type.forEach((et) => p.append("event_type", et))
    if (params?.subject) p.set("subject", params.subject)
    if (params?.result) p.set("result", params.result)
    if (params?.from) p.set("from", params.from)
    if (params?.to) p.set("to", params.to)
    return getAdmin<ListResponse<AuditEventApiItem>>(
      `/api/admin/audit?${p.toString()}`
    )
      .then((res) => ({
        ...res,
        items: res.items.map(normalizeAuditEvent),
      }))
  },

  stats: (from?: string, to?: string) => {
    const p = buildSearchParams({ from, to })
    return getAdmin<AuditStats>(`/api/admin/audit/stats?${p.toString()}`)
  },

  verify: (from?: string, to?: string) => {
    const p = buildSearchParams({ from, to })
    return getAdmin<ChainVerification>(`/api/admin/audit/verify?${p.toString()}`)
  },
}

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

export interface Tenant {
  id: string
  code: string
  name: string
  status: string
  createdAt?: string
  updatedAt?: string
}

export interface TenantMember {
  userId: string
  username: string
  email: string
  displayName: string
  status: string
  isDefault: boolean
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
  createdAt?: string
  lastSeenAt?: string
  expiresAt?: string
}

type AdminUserSessionApiItem = {
  id: string
  device_id?: string
  device_name?: string
  device_type?: string
  os?: string
  browser?: string
  ip_address?: string
  user_agent?: string
  created_at?: string
  last_seen_at?: string
  expires_at?: string
}

const normalizeAdminUserSession = (
  session: AdminUserSessionApiItem
): AdminUserSession => ({
  id: session.id,
  deviceId: session.device_id,
  deviceName: session.device_name,
  deviceType: session.device_type,
  browser: session.browser,
  os: session.os,
  ipAddress: session.ip_address,
  userAgent: session.user_agent,
  createdAt: session.created_at,
  lastSeenAt: session.last_seen_at,
  expiresAt: session.expires_at,
})

type UserApiItem = {
  id: string
  username: string
  email: string
  name: string
  nickname?: string
  first_name?: string
  last_name?: string
  gender?: string
  country?: string
  address?: string
  position?: string
  status: string
  source?: string
  kratos_identity_id?: string
  roles?: string[] | null
  tenant_id: string
  created_at: string
  updated_at?: string
}

const normalizeUser = (user: UserApiItem): User => ({
  id: user.id,
  username: user.username,
  email: user.email,
  name: user.name,
  nickname: user.nickname,
  firstName: user.first_name,
  lastName: user.last_name,
  gender: user.gender,
  country: user.country,
  address: user.address,
  position: user.position,
  status: user.status,
  source: user.source,
  kratosIdentityId: user.kratos_identity_id,
  roles: Array.isArray(user.roles) ? user.roles : [],
  tenantId: user.tenant_id,
  createdAt: user.created_at,
})

export interface Role {
  id: string
  code: string
  name: string
  status: string
  tenantId: string
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

type RoleApiItem = {
  id: string
  code: string
  name: string
  status: string
  tenant_id: string
  permissions?: PermissionApiItem[]
}

type PermissionApiItem = IamPermission

type GroupApiItem = {
  id: string
  code: string
  name: string
  description?: string
  status: string
  tenant_id: string
  is_system: boolean
  member_count: number
  role_count: number
  created_at: string
  updated_at: string
}

const normalizeRole = (role: RoleApiItem): Role => ({
  id: role.id,
  code: role.code,
  name: role.name,
  status: role.status,
  tenantId: role.tenant_id,
  permissions: role.permissions?.map(normalizePermission),
})

const normalizeGroup = (group: GroupApiItem): Group => ({
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

const normalizePermission = (permission: PermissionApiItem): Permission => ({
  id: permission.id,
  code: permission.code,
  name: permission.name,
  module: permission.module,
  resource: permission.resource,
  operation: permission.operation,
})

type AdminListInput = {
  page?: number
  perPage?: number
  q?: string
  sort?: string
  order?: "asc" | "desc" | string
  status?: string
  tenantId?: string
  module?: string
}

function buildAdminListQuery(params?: AdminListInput): URLSearchParams {
  const order =
    params?.order?.toLowerCase() === "desc"
      ? "desc"
      : params?.order
        ? "asc"
        : undefined
  return buildListSearchParams({
    page: params?.page,
    perPage: params?.perPage,
    q: params?.q,
    sort: params?.sort,
    order,
    status: params?.status,
    tenant_id: params?.tenantId,
    module: params?.module,
  })
}

function targetPath(path: string, tenantId: string): string {
  const separator = path.includes("?") ? "&" : "?"
  return `${path}${separator}tenant_id=${encodeURIComponent(tenantId)}`
}

async function getAdmin<T>(path: string): Promise<T> {
  const response = await api.get<ApiSuccess<T>>(path)
  return response.result
}

async function postAdmin<T = unknown>(path: string, body?: unknown): Promise<T> {
  const response = await api.post<ApiSuccess<T>>(path, body)
  return response.result
}

async function putAdmin<T = unknown>(path: string, body?: unknown): Promise<T> {
  const response = await api.put<ApiSuccess<T>>(path, body)
  return response.result
}

async function deleteAdmin<T = undefined>(path: string): Promise<T | undefined> {
  const response = await api.delete<ApiSuccess<T>>(path)
  return response?.result
}

type CreateUserInput = {
  username: string
  email: string
  password: string
  name?: string
  nickname?: string
  firstName?: string
  lastName?: string
  gender?: string
  country?: string
  address?: string
  position?: string
  tenantId: string
  role_ids?: string[]
}

function toCreateUserBody(data: CreateUserInput) {
  return {
    username: data.username,
    email: data.email,
    password: data.password,
    name: data.name,
    nickname: data.nickname,
    first_name: data.firstName,
    last_name: data.lastName,
    gender: data.gender,
    country: data.country,
    address: data.address,
    position: data.position,
    tenant_id: data.tenantId,
    role_ids: data.role_ids,
  }
}

function toUpdateUserBody(data: Record<string, unknown>) {
  const body: Record<string, unknown> = {}
  const map: Record<string, string> = {
    firstName: "first_name",
    lastName: "last_name",
    tenantId: "tenant_id",
  }
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue
    body[map[key] ?? key] = value
  }
  return body
}

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

export const adminApi = {
  // Tenant registry
  listTenants: () => getAdmin<Tenant[]>('/api/admin/tenants'),
  createTenant: (data: { code: string; name: string; ownerUserId?: string }) =>
    postAdmin<Tenant>('/api/admin/tenants', {
      code: data.code,
      name: data.name,
      owner_user_id: data.ownerUserId,
    }),
  listTenantMembers: (tenantId: string) =>
    getAdmin<TenantMember[]>(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/members`
    ),
  addTenantMember: (tenantId: string, userId: string, isDefault = false) =>
    postAdmin(`/api/admin/tenants/${encodeURIComponent(tenantId)}/members`, {
      user_id: userId,
      is_default: isDefault,
    }),
  removeTenantMember: (tenantId: string, userId: string) =>
    deleteAdmin(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/members/${encodeURIComponent(userId)}`
    ),

  // Users
  listUsers: (params?: AdminListInput) =>
    getAdmin<ListResponse<UserApiItem>>(
      `/api/admin/users?${buildAdminListQuery(params).toString()}`
    )
      .then((res) => ({
        ...res,
        items: res.items.map(normalizeUser),
      })),
  getUser: (id: string, tenantId: string) =>
    getAdmin<UserApiItem>(targetPath(`/api/admin/users/${id}`, tenantId)).then(
      normalizeUser
    ),
  createUser: (data: CreateUserInput) =>
    postAdmin("/api/admin/users", toCreateUserBody(data)),
  updateUser: (id: string, tenantId: string, data: Record<string, unknown>) =>
    putAdmin(
      targetPath(`/api/admin/users/${id}`, tenantId),
      toUpdateUserBody(data)
    ),
  deleteUser: (id: string, tenantId: string) =>
    deleteAdmin(targetPath(`/api/admin/users/${id}`, tenantId)),
  disableUser: (id: string, tenantId: string) =>
    putAdmin(targetPath(`/api/admin/users/${id}/status`, tenantId), {
      status: "DISABLED",
    }),
  enableUser: (id: string, tenantId: string) =>
    putAdmin(targetPath(`/api/admin/users/${id}/status`, tenantId), {
      status: "ACTIVE",
    }),
  resetUserPassword: (id: string, tenantId: string, password: string) =>
    postAdmin<{ status: string }>(
      targetPath(`/api/admin/users/${id}/identity/password/reset`, tenantId),
      { password }
    ),
  resetUserMFA: (id: string, tenantId: string) =>
    postAdmin<{ status: string }>(
      targetPath(`/api/admin/users/${id}/mfa/reset`, tenantId)
    ),
  provisionUserIdentity: (
    id: string,
    tenantId: string,
    temporaryPassword: string
  ) =>
    postAdmin<{
        status: string
        kratos_identity_id?: string
        kratosIdentityId?: string
      }>(targetPath(`/api/admin/users/${id}/identity/provision`, tenantId), {
        temporary_password: temporaryPassword,
      })
      .then((res) => ({
        status: res.status,
        kratosIdentityId: res.kratos_identity_id ?? res.kratosIdentityId ?? "",
      })),
  auditIdentityConsistency: () =>
    getAdmin<{ ok: boolean; count: number; issues: IdentityConsistencyIssue[] }>(
      "/api/admin/identity/consistency"
    ),
  listUserSessions: (id: string, tenantId: string) =>
    getAdmin<{ sessions: AdminUserSessionApiItem[] }>(
      targetPath(`/api/admin/users/${id}/sessions`, tenantId)
    )
      .then((res) => ({
        sessions: (res.sessions ?? []).map(normalizeAdminUserSession),
      })),
  revokeUserSessions: (id: string, tenantId: string, reason = "admin_revoked") =>
    deleteAdmin<{ status: string; count: number }>(
      targetPath(
        `/api/admin/users/${id}/sessions?reason=${encodeURIComponent(reason)}`,
        tenantId
      )
    ),

  // Groups
  listGroups: (params?: AdminListInput) =>
    getAdmin<ListResponse<GroupApiItem>>(
      `/api/admin/groups?${buildAdminListQuery(params).toString()}`
    )
      .then((res) => ({
        ...res,
        items: res.items.map(normalizeGroup),
      })),
  getGroup: (id: string, tenantId: string) =>
    getAdmin<{ group: GroupApiItem }>(
      targetPath(`/api/admin/groups/${id}`, tenantId)
    )
      .then((res) => ({ group: normalizeGroup(res.group) })),
  createGroup: (data: {
    code: string
    name: string
    description?: string
    status: string
    tenantId: string
  }) => postAdmin("/api/admin/groups", toCreateGroupBody(data)),
  updateGroup: (
    id: string,
    data: {
      name?: string
      description?: string
      status?: string
      tenantId: string
    }
  ) =>
    putAdmin(
      targetPath(`/api/admin/groups/${id}`, data.tenantId),
      toUpdateGroupBody(data)
    ),
  deleteGroup: (id: string, tenantId: string) =>
    deleteAdmin(targetPath(`/api/admin/groups/${id}`, tenantId)),
  listGroupMembers: (id: string, tenantId: string) =>
    getAdmin<{ items: UserApiItem[] }>(
      targetPath(`/api/admin/groups/${id}/members`, tenantId)
    )
      .then((res) => ({
        items: (res.items ?? []).map(normalizeUser),
      })),
  addGroupMember: (groupId: string, userId: string, tenantId: string) =>
    postAdmin(
      targetPath(`/api/admin/groups/${groupId}/members`, tenantId),
      { user_id: userId }
    ),
  removeGroupMember: (groupId: string, userId: string, tenantId: string) =>
    deleteAdmin(
      targetPath(`/api/admin/groups/${groupId}/members/${userId}`, tenantId)
    ),
  listGroupRoles: (id: string, tenantId: string) =>
    getAdmin<{ roles: RoleApiItem[] }>(
      targetPath(`/api/admin/groups/${id}/roles`, tenantId)
    )
      .then((res) => ({ roles: (res.roles ?? []).map(normalizeRole) })),
  assignGroupRole: (groupId: string, roleId: string, tenantId: string) =>
    postAdmin(
      targetPath(`/api/admin/groups/${groupId}/roles`, tenantId),
      { role_id: roleId }
    ),
  unassignGroupRole: (groupId: string, roleId: string, tenantId: string) =>
    deleteAdmin(
      targetPath(`/api/admin/groups/${groupId}/roles/${roleId}`, tenantId)
    ),

  // Roles
  listRoles: (params?: AdminListInput) =>
    getAdmin<ListResponse<RoleApiItem>>(
      `/api/admin/roles?${buildAdminListQuery(params).toString()}`
    )
      .then((res) => ({
        ...res,
        items: res.items.map(normalizeRole),
      })),
  getRole: (id: string, tenantId: string) =>
    getAdmin<{ role: RoleApiItem; permissions: PermissionApiItem[] }>(
      targetPath(`/api/admin/roles/${id}`, tenantId)
    )
      .then((res) => ({
        role: normalizeRole(res.role),
        permissions: (res.permissions ?? []).map(normalizePermission),
      })),
  createRole: (data: { code: string; name: string; tenantId: string }) =>
    postAdmin("/api/admin/roles", {
      code: data.code,
      name: data.name,
      tenant_id: data.tenantId,
    }),
  updateRole: (id: string, tenantId: string, data: { name?: string }) =>
    putAdmin(targetPath(`/api/admin/roles/${id}`, tenantId), data),
  deleteRole: (id: string, tenantId: string) =>
    deleteAdmin(targetPath(`/api/admin/roles/${id}`, tenantId)),
  listRolePermissions: (roleId: string, tenantId: string) =>
    getAdmin<{ permissions: PermissionApiItem[] }>(
      targetPath(`/api/admin/roles/${roleId}/permissions`, tenantId)
    )
      .then((res) => ({
        permissions: (res.permissions ?? []).map(normalizePermission),
      })),
  assignRolePermission: (roleId: string, permissionId: string, tenantId: string) =>
    postAdmin(
      targetPath(`/api/admin/roles/${roleId}/permissions/assign`, tenantId),
      { permission_id: permissionId }
    ),
  unassignRolePermission: (roleId: string, permissionId: string, tenantId: string) =>
    deleteAdmin(
      targetPath(
        `/api/admin/roles/${roleId}/permissions/${permissionId}`,
        tenantId
      )
    ),

  // Permissions
  listPermissions: (params?: AdminListInput) =>
    getAdmin<ListResponse<PermissionApiItem>>(
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
  }) => postAdmin("/api/admin/permissions", data),
  deletePermission: (id: string) => deleteAdmin(`/api/admin/permissions/${id}`),

  // Role assignments
  assignRole: (userId: string, roleId: string, tenantId: string) =>
    postAdmin(targetPath(`/api/admin/users/${userId}/roles`, tenantId), {
      role_id: roleId,
    }),
  unassignRole: (userId: string, roleId: string, tenantId: string) =>
    deleteAdmin(
      targetPath(`/api/admin/users/${userId}/roles/${roleId}`, tenantId)
    ),
}
