import { api } from "@workspace/api"

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

export const sessionApi = {
  list: () => api.get<{ sessions: Session[]; currentSessionId?: string }>("/api/iam/me/sessions"),
  revoke: (id: string) => api.delete(`/api/iam/me/sessions/${id}`),
  revokeOthers: (keep: string) => api.delete(`/api/iam/me/sessions?keep=${keep}`),
  devices: () => api.get<{ devices: Device[] }>("/api/iam/me/devices"),
  deleteDevice: (id: string) => api.delete(`/api/iam/me/devices/${id}`),
  trustDevice: (id: string) => api.post(`/api/iam/me/devices/${id}/trust`),
  config: () => api.get<SessionConfig>("/api/iam/session/config"),
}
