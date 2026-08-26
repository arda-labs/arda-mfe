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

export type UserApiItem = {
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

export type AdminUserSessionApiItem = {
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

export interface IdentityConsistencyIssue {
  type: string
  userId?: string
  username?: string
  email?: string
  kratosIdentityId?: string
  mappingIdentityId?: string
  count?: number
}

export type CreateUserInput = {
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
