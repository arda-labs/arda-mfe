import { getCurrentLocale } from "@workspace/i18n"

import { createApiClient } from "./client"
import { getApiBaseURL } from "./url"

export type {
  ApiClientErrorPayload,
  ApiClientValidationError,
  ApiRequestOptions,
  ApiProblem,
  ApiResponseMeta,
  ApiSuccess,
  CreateApiClientOptions,
} from "./client"
export { ApiClientError } from "./client"

export type ApiAuthHandlers = {
  onUnauthorized?: () => void | Promise<void>
  onRecentAuthRequired?: () => boolean | void | Promise<boolean | void>
}

let authHandlers: ApiAuthHandlers = {}
let getActiveOrgId: (() => string | undefined) | undefined

export function configureApiContext(context: {
  getActiveOrgId?: () => string | undefined
}) {
  getActiveOrgId = context.getActiveOrgId
}

/** Inject authentication behavior without making API depend on auth. */
export function configureApiAuthHandlers(handlers: ApiAuthHandlers) {
  authHandlers = handlers
}

export const api = createApiClient({
  baseURL: getApiBaseURL(),
  getLocale: getCurrentLocale,
  getActiveOrgId: () => getActiveOrgId?.(),
  onUnauthorized: () => authHandlers.onUnauthorized?.(),
  onRecentAuthRequired: async () => {
    if (!authHandlers.onRecentAuthRequired) return false
    return authHandlers.onRecentAuthRequired()
  },
})
