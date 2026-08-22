import { configureApiAuthHandlers } from "@workspace/api"

import { ensureRecentAuth } from "./ensure-recent-auth"
import { useAuthStore } from "./store"

/** Application composition: connect the auth feature to the generic API client. */
configureApiAuthHandlers({
  onUnauthorized: async () => {
    await useAuthStore.getState().logout()
    if (typeof window !== "undefined") window.location.href = "/login"
  },
  onRecentAuthRequired: ensureRecentAuth,
})
