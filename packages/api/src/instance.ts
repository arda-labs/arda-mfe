import { getCurrentLocale } from "@workspace/i18n"

import { createApiClient } from "./client"
import { getApiBaseURL } from "./url"

export type ApiAuthHandlers = {
  onUnauthorized?: () => void | Promise<void>
  onRecentAuthRequired?: () => boolean | void | Promise<boolean | void>
  onOrganizationForbidden?: () => void | Promise<void>
}

let authHandlers: ApiAuthHandlers = {}
let getActiveOrgId: (() => string | undefined) | undefined
let getSessionScope: (() => string) | undefined

export function configureApiContext(context: {
  getActiveOrgId?: () => string | undefined
  getSessionScope?: () => string
}) {
  getActiveOrgId = context.getActiveOrgId
  getSessionScope = context.getSessionScope
}

/** Inject authentication behavior without making API depend on auth. */
export function configureApiAuthHandlers(handlers: ApiAuthHandlers) {
  authHandlers = handlers
}

export const api = createApiClient({
  baseURL: getApiBaseURL(),
  getLocale: getCurrentLocale,
  getActiveOrgId: () => getActiveOrgId?.(),
  getSessionScope: () => getSessionScope?.() ?? "",
  onUnauthorized: () => authHandlers.onUnauthorized?.(),
  onOrganizationForbidden: () => authHandlers.onOrganizationForbidden?.(),
  onRecentAuthRequired: async () => {
    if (!authHandlers.onRecentAuthRequired) return false
    return authHandlers.onRecentAuthRequired()
  },
})
