import { createRequestId } from "./list"
import { getApiBaseURL } from "./url"

const AUTHENTICATION_FAILURE_CODES = new Set([
  "auth.error.unauthorized",
  "auth.error.session_expired",
  "common.error.session_expired",
  "not_authenticated",
  "session_expired",
])

export interface ApiClientErrorPayload {
  code: string
  message: string
  fields?: Record<string, string>
  request_id?: string
  trace_id?: string
  errors?: Array<ApiClientValidationError>
}

export interface ApiClientValidationError {
  code?: string
  message: string
  field?: string
  path?: string
}

export interface ApiResponseMeta {
  request_id: string
  trace_id?: string
  timestamp?: string
}

/** Canonical success envelope for migrated JSON endpoints. Domain adapters must
 * declare their result profile; the transport does not guess response shapes. */
export interface ApiSuccess<T> {
  result: T
  success: true
  errors: []
  messages: string[]
  meta?: ApiResponseMeta
}

export interface ApiProblem {
  type?: string
  title?: string
  status?: number
  code: string
  message: string
  errors?: Array<ApiClientValidationError>
  request_id?: string
  trace_id?: string
}

export class ApiClientError extends Error {
  code: string
  status: number
  fields?: Record<string, string>
  errors?: Array<ApiClientValidationError>
  // Canonical Problem.request_id — trace correlation cho dev debug. Parse ở
  // parseApiClientError, lưu vào đây để dialog lỗi hiển thị + copy.
  requestId?: string

  constructor(
    code: string,
    message: string,
    status: number,
    fields?: Record<string, string>,
    requestId?: string,
    errors?: Array<ApiClientValidationError>
  ) {
    super(message)
    this.name = "ApiClientError"
    this.code = code
    this.status = status
    this.fields = fields
    this.requestId = requestId
    this.errors = errors
  }
}

export interface CreateApiClientOptions {
  baseURL?: string
  getLocale?: () => string
  getActiveOrgId?: () => string | undefined
  onUnauthorized?: () => void | Promise<void>
  onRecentAuthRequired?: () => boolean | void | Promise<boolean | void>
}

export interface ApiRequestOptions {
  signal?: AbortSignal
  /** Standard command retry key; sent as Idempotency-Key, never as a body guess. */
  idempotencyKey?: string
}

export function createApiClient(options: CreateApiClientOptions = {}) {
  const baseURL = options.baseURL ?? getApiBaseURL()
  const inflightGet = new Map<string, Promise<unknown>>()

  const request = async <T>(
    method: string,
    path: string,
    body?: unknown,
    didStepUp = false,
    requestOptions: ApiRequestOptions = {},
    responseType: "json" | "text" = "json",
    requestId = createRequestId()
  ): Promise<T> => {
    const headers: Record<string, string> = {
      "X-Request-Id": requestId,
    }
    const locale = options.getLocale?.()
    if (locale) headers["Accept-Language"] = locale
    const activeOrgId = options.getActiveOrgId?.()?.trim()
    if (activeOrgId) headers["X-Org-Id"] = activeOrgId
    const idempotencyKey = requestOptions.idempotencyKey?.trim()
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey

    let requestBody: BodyInit | undefined = undefined
    if (body !== undefined) {
      if (typeof FormData !== "undefined" && body instanceof FormData) {
        requestBody = body
      } else {
        headers["Content-Type"] = "application/json"
        requestBody = JSON.stringify(body)
      }
    }

    const res = await fetch(`${baseURL}${path}`, {
      method,
      headers,
      credentials: "include",
      body: requestBody,
      signal: requestOptions.signal,
    })

    if (res.status === 401) {
      const payload = await parseApiClientError(res)
      if (isAuthenticationFailureCode(payload.code)) {
        await options.onUnauthorized?.()
      }
      throw new ApiClientError(
        payload.code,
        payload.message,
        res.status,
        payload.fields,
        payload.request_id ?? res.headers.get("X-Request-Id") ?? undefined,
        payload.errors
      )
    }

    if (!res.ok) {
      const payload = await parseApiClientError(res)
      if (res.status === 403 && payload.code === "recent_auth_required") {
        if (!didStepUp) {
          const verified = await options.onRecentAuthRequired?.()
          if (verified !== false) {
            return request<T>(
              method,
              path,
              body,
              true,
              requestOptions,
              responseType,
              requestId
            )
          }
        }
      }
      throw new ApiClientError(
        payload.code,
        payload.message,
        res.status,
        payload.fields,
        payload.request_id ?? res.headers.get("X-Request-Id") ?? undefined,
        payload.errors
      )
    }

    if (res.status === 204) return undefined as T
    return (responseType === "text" ? res.text() : res.json()) as Promise<T>
  }

  const get = <T = unknown>(
    path: string,
    requestOptions: ApiRequestOptions = {}
  ): Promise<T> => {
    // A caller-provided AbortSignal has its own lifecycle. Do not share that
    // promise with unrelated consumers; the server-state layer handles dedupe.
    if (requestOptions.signal) {
      return request<T>("GET", path, undefined, false, requestOptions)
    }

    const locale = options.getLocale?.() ?? ""
    const activeOrgId = options.getActiveOrgId?.() ?? ""
    const key = `${baseURL}${path}|${locale}|${activeOrgId}`
    const existing = inflightGet.get(key)
    if (existing) return existing as Promise<T>

    const promise = request<T>("GET", path).finally(() => {
      inflightGet.delete(key)
    })
    inflightGet.set(key, promise)
    return promise
  }

  return {
    get,
    getText: (path: string, requestOptions?: ApiRequestOptions) =>
      request<string>("GET", path, undefined, false, requestOptions, "text"),
    post: <T = unknown>(
      path: string,
      body?: unknown,
      requestOptions?: ApiRequestOptions
    ) => request<T>("POST", path, body, false, requestOptions),
    put: <T = unknown>(
      path: string,
      body?: unknown,
      requestOptions?: ApiRequestOptions
    ) => request<T>("PUT", path, body, false, requestOptions),
    delete: <T = unknown>(path: string, requestOptions?: ApiRequestOptions) =>
      request<T>("DELETE", path, undefined, false, requestOptions),
  }
}

function isAuthenticationFailureCode(code: string): boolean {
  return AUTHENTICATION_FAILURE_CODES.has(code)
}

async function parseApiClientError(
  res: Response
): Promise<ApiClientErrorPayload> {
  const fallback = {
    code: "common.error.api_failed",
    message: `Request failed with status ${res.status}`,
    fields: undefined,
    request_id: res.headers.get("X-Request-Id") ?? undefined,
  }
  const text = await res.text().catch(() => "")
  if (!text) return fallback

  const contentType = res.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase()
  if (contentType !== "application/problem+json") return fallback

  try {
    const json = JSON.parse(text)
    if (!json || typeof json !== "object" || Array.isArray(json)) {
      return fallback
    }
    if (typeof json.type !== "string" || typeof json.status !== "number") {
      return fallback
    }

    const code = typeof json.code === "string" ? json.code : undefined
    const message = typeof json.message === "string" ? json.message : undefined
    if (!code || !message) return fallback

    const errors = normalizeValidationErrors(json.errors)
    return {
      code,
      message,
      request_id:
        typeof json.request_id === "string"
          ? json.request_id
          : fallback.request_id,
      trace_id: typeof json.trace_id === "string" ? json.trace_id : undefined,
      errors,
    }
  } catch {
    return { code: fallback.code, message: text, fields: undefined }
  }
}

function normalizeValidationErrors(value: unknown): Array<ApiClientValidationError> | undefined {
  if (!Array.isArray(value)) return undefined
  const errors = value.flatMap((item) => {
    if (typeof item === "string") return [{ message: item }]
    if (!item || typeof item !== "object") return []
    const record = item as Record<string, unknown>
    const message = typeof record.message === "string" ? record.message : undefined
    if (!message) return []
    return [
      {
        message,
        code: typeof record.code === "string" ? record.code : undefined,
        field:
          typeof record.field === "string"
            ? record.field
            : typeof record.path === "string"
              ? record.path
              : undefined,
        path: typeof record.path === "string" ? record.path : undefined,
      },
    ]
  })
  return errors.length > 0 ? errors : undefined
}
