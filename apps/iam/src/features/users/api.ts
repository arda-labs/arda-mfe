import {
  deleteCanonical,
  getCanonical,
  postCanonical,
  putCanonical,
} from "@workspace/api"
import { buildListSearchParams, type ListResponse } from "@workspace/api/list"
import type {
  AdminUserSession,
  AdminUserSessionApiItem,
  CreateUserInput,
  IdentityConsistencyIssue,
  User,
  UserApiItem,
} from "./types"

export type AdminListInput = {
  page?: number
  perPage?: number
  q?: string
  sort?: string
  order?: "asc" | "desc" | string
  status?: string
  tenantId?: string
  module?: string
}

export function buildAdminListQuery(params?: AdminListInput): URLSearchParams {
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

export function targetPath(path: string, tenantId: string): string {
  const separator = path.includes("?") ? "&" : "?"
  return `${path}${separator}tenant_id=${encodeURIComponent(tenantId)}`
}

export const normalizeUser = (user: UserApiItem): User => ({
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

export const normalizeAdminUserSession = (
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

export function toCreateUserBody(data: CreateUserInput) {
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

export function toUpdateUserBody(data: Record<string, unknown>) {
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

export const usersApi = {
  listUsers: (params?: AdminListInput) =>
    getCanonical<ListResponse<UserApiItem>>(
      `/api/admin/users?${buildAdminListQuery(params).toString()}`
    ).then((res) => ({
      ...res,
      items: res.items.map(normalizeUser),
    })),
  getUser: (id: string, tenantId: string) =>
    getCanonical<UserApiItem>(targetPath(`/api/admin/users/${id}`, tenantId)).then(
      normalizeUser
    ),
  createUser: (data: CreateUserInput) =>
    postCanonical("/api/admin/users", toCreateUserBody(data)),
  updateUser: (id: string, tenantId: string, data: Record<string, unknown>) =>
    putCanonical(
      targetPath(`/api/admin/users/${id}`, tenantId),
      toUpdateUserBody(data)
    ),
  deleteUser: (id: string, tenantId: string) =>
    deleteCanonical(targetPath(`/api/admin/users/${id}`, tenantId)),
  disableUser: (id: string, tenantId: string) =>
    putCanonical(targetPath(`/api/admin/users/${id}/status`, tenantId), {
      status: "DISABLED",
    }),
  enableUser: (id: string, tenantId: string) =>
    putCanonical(targetPath(`/api/admin/users/${id}/status`, tenantId), {
      status: "ACTIVE",
    }),
  resetUserPassword: (id: string, tenantId: string, password: string) =>
    postCanonical<{ status: string }>(
      targetPath(`/api/admin/users/${id}/identity/password/reset`, tenantId),
      { password }
    ),
  resetUserMFA: (id: string, tenantId: string) =>
    postCanonical<{ status: string }>(
      targetPath(`/api/admin/users/${id}/mfa/reset`, tenantId)
    ),
  provisionUserIdentity: (
    id: string,
    tenantId: string,
    temporaryPassword: string
  ) =>
    postCanonical<{
      status: string
      kratos_identity_id?: string
      kratosIdentityId?: string
    }>(targetPath(`/api/admin/users/${id}/identity/provision`, tenantId), {
      temporary_password: temporaryPassword,
    }).then((res) => ({
      status: res.status,
      kratosIdentityId: res.kratos_identity_id ?? res.kratosIdentityId ?? "",
    })),
  auditIdentityConsistency: () =>
    getCanonical<{ ok: boolean; count: number; issues: IdentityConsistencyIssue[] }>(
      "/api/admin/identity/consistency"
    ),
  listUserSessions: (id: string, tenantId: string) =>
    getCanonical<{ sessions: AdminUserSessionApiItem[] }>(
      targetPath(`/api/admin/users/${id}/sessions`, tenantId)
    ).then((res) => ({
      sessions: (res.sessions ?? []).map(normalizeAdminUserSession),
    })),
  revokeUserSessions: (id: string, tenantId: string, reason = "admin_revoked") =>
    deleteCanonical<{ status: string; count: number }>(
      targetPath(
        `/api/admin/users/${id}/sessions?reason=${encodeURIComponent(reason)}`,
        tenantId
      )
    ),
  assignRole: (userId: string, roleId: string, tenantId: string) =>
    postCanonical(targetPath(`/api/admin/users/${userId}/roles`, tenantId), {
      role_id: roleId,
    }),
  unassignRole: (userId: string, roleId: string, tenantId: string) =>
    deleteCanonical(
      targetPath(`/api/admin/users/${userId}/roles/${roleId}`, tenantId)
    ),
}
