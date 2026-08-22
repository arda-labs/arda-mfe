import { getCurrentLocale } from "@workspace/i18n"

import { createApiClient } from "./client"
import { getApiBaseURL } from "./url"

export type ApiAuthHandlers = {
  onUnauthorized?: () => void | Promise<void>
  onRecentAuthRequired?: () => boolean | void | Promise<boolean | void>
}

let authHandlers: ApiAuthHandlers = {}

/** Inject authentication behavior without making API depend on auth. */
export function configureApiAuthHandlers(handlers: ApiAuthHandlers) {
  authHandlers = handlers
}

export const api = createApiClient({
  baseURL: getApiBaseURL(),
  getLocale: getCurrentLocale,
  onUnauthorized: () => authHandlers.onUnauthorized?.(),
  onRecentAuthRequired: async () => {
    if (!authHandlers.onRecentAuthRequired) return false
    return authHandlers.onRecentAuthRequired()
  },
})
