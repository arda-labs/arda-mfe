import { api } from "@workspace/api"
import { requestStepUp } from "./step-up-channel"

type RecentAuthStatus = {
  recentAuthOk?: boolean
}

export async function ensureRecentAuth(): Promise<boolean> {
  try {
    const data = await api.get<RecentAuthStatus>("/api/auth/recent-auth")
    if (data.recentAuthOk) return true
  } catch {
    // Fall through to interactive step-up.
  }
  return requestStepUp()
}
