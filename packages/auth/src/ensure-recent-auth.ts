import { requestStepUp } from "./step-up-channel"

type RecentAuthStatus = {
  recentAuthOk?: boolean
}

export async function ensureRecentAuth(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/recent-auth", { credentials: "include" })
    if (res.ok) {
      const data = (await res.json()) as RecentAuthStatus
      if (data.recentAuthOk) return true
    }
  } catch {
    // Fall through to interactive step-up.
  }
  return requestStepUp()
}
