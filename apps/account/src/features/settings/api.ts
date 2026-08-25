import { api, type ApiSuccess } from "@workspace/api"

// ── Sessions & Devices ──────────────────────────────

export interface Session {
  id: string
  deviceId: string
  deviceName: string
  deviceType: string
  os: string
  browser: string
  isTrusted: boolean
  trustedUntil?: string | null
  ipAddress: string
  userAgent: string
  createdAt: string
  lastSeenAt: string
  expiresAt: string
  isActive: boolean
  isCurrent: boolean
}

export interface Device {
  id: string
  userId: string
  deviceName: string
  deviceType: string
  os: string
  browser: string
  fingerprint: string
  isTrusted: boolean
  trustedUntil?: string | null
  firstSeenAt: string
  lastSeenAt: string
}

export interface SessionConfig {
  maxConcurrent: number
  maxDevices: number
  sessionTtl: string
}

type SessionApiItem = {
  id: string
  device_id?: string
  device_name?: string
  device_type?: string
  os?: string
  browser?: string
  is_trusted?: boolean
  trusted_until?: string | null
  ip_address?: string
  user_agent?: string
  created_at?: string
  last_seen_at?: string
  expires_at?: string
  is_active?: boolean
  is_current?: boolean
}

type DeviceApiItem = {
  id: string
  user_id?: string
  device_name?: string
  device_type?: string
  os?: string
  browser?: string
  fingerprint?: string
  is_trusted?: boolean
  trusted_until?: string | null
  first_seen_at?: string
  last_seen_at?: string
}

type SessionConfigApi = {
  max_concurrent?: number
  max_devices?: number
  session_ttl?: string
}

const normalizeSession = (session: SessionApiItem): Session => ({
  id: session.id,
  deviceId: session.device_id ?? "",
  deviceName: session.device_name ?? "",
  deviceType: session.device_type ?? "",
  os: session.os ?? "",
  browser: session.browser ?? "",
  isTrusted: session.is_trusted ?? false,
  trustedUntil: session.trusted_until,
  ipAddress: session.ip_address ?? "",
  userAgent: session.user_agent ?? "",
  createdAt: session.created_at ?? "",
  lastSeenAt: session.last_seen_at ?? "",
  expiresAt: session.expires_at ?? "",
  isActive: session.is_active ?? false,
  isCurrent: session.is_current ?? false,
})

const normalizeDevice = (device: DeviceApiItem): Device => ({
  id: device.id,
  userId: device.user_id ?? "",
  deviceName: device.device_name ?? "",
  deviceType: device.device_type ?? "",
  os: device.os ?? "",
  browser: device.browser ?? "",
  fingerprint: device.fingerprint ?? "",
  isTrusted: device.is_trusted ?? false,
  trustedUntil: device.trusted_until,
  firstSeenAt: device.first_seen_at ?? "",
  lastSeenAt: device.last_seen_at ?? "",
})

const normalizeSessionConfig = (config: SessionConfigApi): SessionConfig => ({
  maxConcurrent: config.max_concurrent ?? 0,
  maxDevices: config.max_devices ?? 0,
  sessionTtl: config.session_ttl ?? "",
})

export const sessionApi = {
  list: () =>
    api
      .get<ApiSuccess<{
        sessions: SessionApiItem[]
        current_session_id?: string
        currentSessionId?: string
      }>>("/api/iam/me/sessions")
      .then(({ result }) => ({
        sessions: (result.sessions ?? []).map(normalizeSession),
        currentSessionId:
          result.current_session_id ?? result.currentSessionId ?? undefined,
      })),
  revoke: (id: string) =>
    api.delete<ApiSuccess<{ status: string }>>(`/api/iam/me/sessions/${id}`),
  revokeOthers: (keep: string) =>
    api.delete<ApiSuccess<{ status: string; count: number }>>(
      `/api/iam/me/sessions?keep=${keep}`
    ),
  devices: () =>
    api
      .get<ApiSuccess<{ devices: DeviceApiItem[] }>>("/api/iam/me/devices")
      .then(({ result }) => ({
        devices: (result.devices ?? []).map(normalizeDevice),
      })),
  deleteDevice: (id: string) =>
    api.delete<ApiSuccess<{ status: string }>>(`/api/iam/me/devices/${id}`),
  trustDevice: (id: string) =>
    api.post<ApiSuccess<{ status: string }>>(`/api/iam/me/devices/${id}/trust`),
  config: () =>
    api
      .get<ApiSuccess<SessionConfigApi>>("/api/iam/session/config")
      .then(({ result }) => normalizeSessionConfig(result)),
}

// ── MFA ──────────────────────────────────────────────

export interface MFASecret {
  secret: string
  otpauth_url: string
}

export interface MFAStatus {
  is_enrolled: boolean
  method: string
}

export const mfaApi = {
  getSecret: () =>
    api
      .post<ApiSuccess<MFASecret>>("/api/iam/me/mfa/enroll")
      .then((res) => res.result),
  verifyEnroll: (code: string) =>
    api
      .post<ApiSuccess<{ status: string; backup_codes: string[] }>>(
        "/api/iam/me/mfa/verify-enroll",
        { code }
      )
      .then((res) => res.result),
  status: () =>
    api
      .get<ApiSuccess<MFAStatus>>("/api/iam/me/mfa/status")
      .then((res) => res.result),
  reset: () =>
    api
      .post<ApiSuccess<{ status: string }>>("/api/iam/me/mfa/reset")
      .then((res) => res.result),
  verifyCode: (userId: string, code: string) =>
    api
      .post<ApiSuccess<{ status: string; mfaToken: string }>>(
        "/api/iam/me/mfa/verify",
        { userId, code }
      )
      .then((res) => res.result),
  verifyBackup: (userId: string, code: string) =>
    api
      .post<ApiSuccess<{ status: string; mfaToken: string }>>(
        "/api/iam/me/mfa/backup",
        { userId, backup_code: code }
      )
      .then((res) => res.result),
}
