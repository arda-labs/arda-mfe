import { api } from "@workspace/api"

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
