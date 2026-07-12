import { api } from "@workspace/api"

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

type SessionApiItem = Partial<Session> & {
  device_id?: string
  device_name?: string
  device_type?: string
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

type DeviceApiItem = Partial<Device> & {
  user_id?: string
  device_name?: string
  device_type?: string
  is_trusted?: boolean
  trusted_until?: string | null
  first_seen_at?: string
  last_seen_at?: string
}

type SessionConfigApi = Partial<SessionConfig> & {
  max_concurrent?: number
  max_devices?: number
  session_ttl?: string
}

const normalizeSession = (session: SessionApiItem): Session => ({
  id: session.id ?? "",
  deviceId: session.device_id ?? session.deviceId ?? "",
  deviceName: session.device_name ?? session.deviceName ?? "",
  deviceType: session.device_type ?? session.deviceType ?? "",
  os: session.os ?? "",
  browser: session.browser ?? "",
  isTrusted: session.is_trusted ?? session.isTrusted ?? false,
  trustedUntil: session.trusted_until ?? session.trustedUntil,
  ipAddress: session.ip_address ?? session.ipAddress ?? "",
  userAgent: session.user_agent ?? session.userAgent ?? "",
  createdAt: session.created_at ?? session.createdAt ?? "",
  lastSeenAt: session.last_seen_at ?? session.lastSeenAt ?? "",
  expiresAt: session.expires_at ?? session.expiresAt ?? "",
  isActive: session.is_active ?? session.isActive ?? false,
  isCurrent: session.is_current ?? session.isCurrent ?? false,
})

const normalizeDevice = (device: DeviceApiItem): Device => ({
  id: device.id ?? "",
  userId: device.user_id ?? device.userId ?? "",
  deviceName: device.device_name ?? device.deviceName ?? "",
  deviceType: device.device_type ?? device.deviceType ?? "",
  os: device.os ?? "",
  browser: device.browser ?? "",
  fingerprint: device.fingerprint ?? "",
  isTrusted: device.is_trusted ?? device.isTrusted ?? false,
  trustedUntil: device.trusted_until ?? device.trustedUntil,
  firstSeenAt: device.first_seen_at ?? device.firstSeenAt ?? "",
  lastSeenAt: device.last_seen_at ?? device.lastSeenAt ?? "",
})

const normalizeSessionConfig = (config: SessionConfigApi): SessionConfig => ({
  maxConcurrent: config.max_concurrent ?? config.maxConcurrent ?? 0,
  maxDevices: config.max_devices ?? config.maxDevices ?? 0,
  sessionTtl: config.session_ttl ?? config.sessionTtl ?? "",
})

export const sessionApi = {
  list: () =>
    api
      .get<{
        sessions: SessionApiItem[]
        current_session_id?: string
        currentSessionId?: string
      }>("/api/iam/me/sessions")
      .then((res) => ({
        sessions: (res.sessions ?? []).map(normalizeSession),
        currentSessionId:
          res.current_session_id ?? res.currentSessionId ?? undefined,
      })),
  revoke: (id: string) => api.delete(`/api/iam/me/sessions/${id}`),
  revokeOthers: (keep: string) => api.delete(`/api/iam/me/sessions?keep=${keep}`),
  devices: () =>
    api
      .get<{ devices: DeviceApiItem[] }>("/api/iam/me/devices")
      .then((res) => ({
        devices: (res.devices ?? []).map(normalizeDevice),
      })),
  deleteDevice: (id: string) => api.delete(`/api/iam/me/devices/${id}`),
  trustDevice: (id: string) => api.post(`/api/iam/me/devices/${id}/trust`),
  config: () =>
    api
      .get<SessionConfigApi>("/api/iam/session/config")
      .then(normalizeSessionConfig),
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
  getSecret: () => api.post<MFASecret>("/api/iam/me/mfa/enroll"),
  verifyEnroll: (code: string) =>
    api.post<{ status: string; backup_codes: string[] }>("/api/iam/me/mfa/verify-enroll", { code }),
  status: () => api.get<MFAStatus>("/api/iam/me/mfa/status"),
  reset: () => api.post<{ status: string }>("/api/iam/me/mfa/reset"),
  verifyCode: (userId: string, code: string) =>
    api.post("/api/iam/me/mfa/verify", { userId, code }),
  verifyBackup: (userId: string, code: string) =>
    api.post("/api/iam/me/mfa/backup", { userId, backup_code: code }),
}
