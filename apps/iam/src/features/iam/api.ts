import { api } from "@workspace/api"
import {
  buildListSearchParams,
  type ListResponse,
} from "@workspace/api/list"

// ── Audit ────────────────────────────────────────────

export interface AuditEvent {
  id: string
  eventType: string
  subject: string
  action: string
  resource: string
  result: string
  details: Record<string, any>
  clientIp: string
  userAgent: string
  requestId: string
  serviceName: string
  timestamp: string
}

type AuditEventApiItem = Partial<AuditEvent> & {
  event_type?: string
  client_ip?: string
  user_agent?: string
  request_id?: string
  service_name?: string
  ID?: string
  EventType?: string
  Subject?: string
  Action?: string
  Resource?: string
  Result?: string
  Details?: Record<string, any>
  ClientIP?: string
  UserAgent?: string
  RequestID?: string
  ServiceName?: string
  Timestamp?: string
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
  id: event.id ?? event.ID ?? "",
  eventType: event.event_type ?? event.eventType ?? event.EventType ?? "",
  subject: event.subject ?? event.Subject ?? "",
  action: event.action ?? event.Action ?? "",
  resource: event.resource ?? event.Resource ?? "",
  result: event.result ?? event.Result ?? "",
  details: event.details ?? event.Details ?? {},
  clientIp: event.client_ip ?? event.clientIp ?? event.ClientIP ?? "",
  userAgent: event.user_agent ?? event.userAgent ?? event.UserAgent ?? "",
  requestId: event.request_id ?? event.requestId ?? event.RequestID ?? "",
  serviceName: event.service_name ?? event.serviceName ?? event.ServiceName ?? "",
  timestamp: event.timestamp ?? event.Timestamp ?? "",
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
    if (params?.event_type) params.event_type.forEach((et) => p.append("event_type", et))
    if (params?.subject) p.set("subject", params.subject)
    if (params?.result) p.set("result", params.result)
    if (params?.from) p.set("from", params.from)
    if (params?.to) p.set("to", params.to)
    return api
      .get<ListResponse<AuditEventApiItem>>(`/api/admin/audit?${p.toString()}`)
      .then((res) => ({
        ...res,
        items: res.items.map(normalizeAuditEvent),
      }))
  },

  stats: (from?: string, to?: string) => {
    const p = new URLSearchParams()
    if (from) p.set("from", from)
    if (to) p.set("to", to)
    return api.get<AuditStats>(`/api/admin/audit/stats?${p.toString()}`)
  },

  verify: (from?: string, to?: string) => {
    const p = new URLSearchParams()
    if (from) p.set("from", from)
    if (to) p.set("to", to)
    return api.get<ChainVerification>(`/api/admin/audit/verify?${p.toString()}`)
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

type AdminUserSessionApiItem = Partial<AdminUserSession> & {
  device_id?: string
  device_name?: string
  device_type?: string
  ip_address?: string
  user_agent?: string
  created_at?: string
  last_seen_at?: string
  expires_at?: string
}

const normalizeAdminUserSession = (
  session: AdminUserSessionApiItem
): AdminUserSession => ({
  id: session.id ?? "",
  deviceId: session.device_id ?? session.deviceId,
  deviceName: session.device_name ?? session.deviceName,
  deviceType: session.device_type ?? session.deviceType,
  browser: session.browser,
  os: session.os,
  ipAddress: session.ip_address ?? session.ipAddress,
  userAgent: session.user_agent ?? session.userAgent,
  status: session.status,
  createdAt: session.created_at ?? session.createdAt,
  lastSeenAt: session.last_seen_at ?? session.lastSeenAt,
  expiresAt: session.expires_at ?? session.expiresAt,
})

type UserApiItem = Partial<User> & {
  first_name?: string
  last_name?: string
  kratos_identity_id?: string
  tenant_id?: string
  created_at?: string
  updated_at?: string
  roles?: string[]
  // legacy camelCase fallback
  firstName?: string
  lastName?: string
  kratosIdentityId?: string
  tenantId?: string
  createdAt?: string
  updatedAt?: string
}

const normalizeUser = (user: UserApiItem): User => ({
  id: user.id ?? "",
  username: user.username ?? "",
  email: user.email ?? "",
  name: user.name ?? "",
  nickname: user.nickname,
  firstName: user.first_name ?? user.firstName,
  lastName: user.last_name ?? user.lastName,
  gender: user.gender,
  country: user.country,
  address: user.address,
  position: user.position,
  status: user.status ?? "",
  source: user.source,
  kratosIdentityId: user.kratos_identity_id ?? user.kratosIdentityId,
  roles: user.roles ?? [],
  tenantId: user.tenant_id ?? user.tenantId ?? "default",
  createdAt: user.created_at ?? user.createdAt ?? "",
})

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
  tenant_id?: string
  created_at?: string
  updated_at?: string
  ID?: string
  Code?: string
  Name?: string
  Status?: string
  TenantID?: string
  CreatedAt?: string
  UpdatedAt?: string
}

type PermissionApiItem = Partial<Permission> & {
  created_at?: string
  ID?: string
  Code?: string
  Name?: string
  Module?: string
  Resource?: string
  Operation?: string
  CreatedAt?: string
}

type GroupApiItem = Partial<Group> & {
  tenant_id?: string
  is_system?: boolean
  member_count?: number
  role_count?: number
  created_at?: string
  updated_at?: string
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
  tenantId: group.tenant_id ?? group.tenantId ?? group.TenantID ?? "default",
  isSystem: group.is_system ?? group.isSystem ?? group.IsSystem ?? false,
  memberCount: group.member_count ?? group.memberCount ?? group.MemberCount ?? 0,
  roleCount: group.role_count ?? group.roleCount ?? group.RoleCount ?? 0,
  createdAt: group.created_at ?? group.createdAt ?? group.CreatedAt ?? "",
  updatedAt: group.updated_at ?? group.updatedAt ?? group.UpdatedAt ?? "",
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
  tenantId?: string
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
  // Users
  listUsers: (params?: AdminListInput) =>
    api
      .get<ListResponse<UserApiItem>>(
        `/api/admin/users?${buildAdminListQuery(params).toString()}`
      )
      .then((res) => ({
        ...res,
        items: res.items.map(normalizeUser),
      })),
  getUser: (id: string) =>
    api.get<UserApiItem>(`/api/admin/users/${id}`).then(normalizeUser),
  createUser: (data: CreateUserInput) =>
    api.post("/api/admin/users", toCreateUserBody(data)),
  updateUser: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/admin/users/${id}`, toUpdateUserBody(data)),
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
  resetUserMFA: (id: string) =>
    api.post<{ status: string }>(`/api/admin/users/${id}/mfa/reset`),
  provisionUserIdentity: (id: string, temporaryPassword: string) =>
    api
      .post<{ status: string; kratos_identity_id?: string; kratosIdentityId?: string }>(
        `/api/admin/users/${id}/identity/provision`,
        { temporary_password: temporaryPassword }
      )
      .then((res) => ({
        status: res.status,
        kratosIdentityId:
          res.kratos_identity_id ?? res.kratosIdentityId ?? "",
      })),
  auditIdentityConsistency: () =>
    api.get<{ ok: boolean; count: number; issues: IdentityConsistencyIssue[] }>(
      "/api/admin/identity/consistency"
    ),
  listUserSessions: (id: string) =>
    api
      .get<{ sessions: AdminUserSessionApiItem[] }>(
        `/api/admin/users/${id}/sessions`
      )
      .then((res) => ({
        sessions: (res.sessions ?? []).map(normalizeAdminUserSession),
      })),
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
  }) => api.post("/api/admin/groups", toCreateGroupBody(data)),
  updateGroup: (
    id: string,
    data: {
      name?: string
      description?: string
      status?: string
      tenantId?: string
    }
  ) => api.put(`/api/admin/groups/${id}`, toUpdateGroupBody(data)),
  deleteGroup: (id: string) => api.delete(`/api/admin/groups/${id}`),
  listGroupMembers: (id: string) =>
    api
      .get<{ items: UserApiItem[] }>(`/api/admin/groups/${id}/members`)
      .then((res) => ({
        items: (res.items ?? []).map(normalizeUser),
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
  createRole: (data: { code: string; name: string; tenantId?: string }) =>
    api.post("/api/admin/roles", {
      code: data.code,
      name: data.name,
      tenant_id: data.tenantId,
    }),
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
