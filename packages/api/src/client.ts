import { createRequestId } from "./list"
import { getApiBaseURL } from "./url"

export interface ApiClientErrorPayload {
  code: string
  message: string
  fields?: Record<string, string>
  request_id?: string
}

export class ApiClientError extends Error {
  code: string
  status: number
  fields?: Record<string, string>
  // BE `error.request_id` — trace correlation cho dev debug. Parse ở
  // parseApiClientError, lưu vào đây để dialog lỗi hiển thị + copy.
  requestId?: string

  constructor(
    code: string,
    message: string,
    status: number,
    fields?: Record<string, string>,
    requestId?: string
  ) {
    super(message)
    this.name = "ApiClientError"
    this.code = code
    this.status = status
    this.fields = fields
    this.requestId = requestId
  }
}

export interface CreateApiClientOptions {
  baseURL?: string
  getLocale?: () => string
  onUnauthorized?: () => void | Promise<void>
  onRecentAuthRequired?: () => boolean | void | Promise<boolean | void>
}

export interface ApiRequestOptions {
  signal?: AbortSignal
}

export function createApiClient(options: CreateApiClientOptions = {}) {
  const baseURL = options.baseURL ?? getApiBaseURL()
  const inflightGet = new Map<string, Promise<unknown>>()

  const request = async <T>(
    method: string,
    path: string,
    body?: unknown,
    didStepUp = false,
    requestOptions: ApiRequestOptions = {}
  ): Promise<T> => {
    const headers: Record<string, string> = {
      "X-Request-Id": createRequestId(),
    }
    const locale = options.getLocale?.()
    if (locale) headers["Accept-Language"] = locale

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
      await options.onUnauthorized?.()
      throw new ApiClientError(
        "common.error.session_expired",
        "Session expired",
        res.status
      )
    }

    if (!res.ok) {
      const payload = await parseApiClientError(res)
      if (res.status === 403 && payload.code === "recent_auth_required") {
        const verified = await options.onRecentAuthRequired?.()
        if (!didStepUp && verified !== false) {
          return request<T>(method, path, body, true, requestOptions)
        }
      }
      throw new ApiClientError(
        payload.code,
        payload.message,
        res.status,
        payload.fields,
        payload.request_id
      )
    }

    return res.json()
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
    const key = `${baseURL}${path}|${locale}`
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

async function parseApiClientError(
  res: Response
): Promise<ApiClientErrorPayload> {
  const fallback = {
    code: "common.error.api_failed",
    message: `Request failed with status ${res.status}`,
    fields: undefined,
  }
  const text = await res.text().catch(() => "")
  if (!text) return fallback

  try {
    const json = JSON.parse(text)
    if (json?.error && typeof json.error === "object") {
      return {
        code: String(json.error.code ?? json.error.error ?? fallback.code),
        message: String(
          json.error.message ?? json.error.error ?? fallback.message
        ),
        fields: json.error.fields as Record<string, string> | undefined,
        request_id:
          typeof json.error.request_id === "string"
            ? json.error.request_id
            : undefined,
      }
    }
    if (typeof json?.error === "string") {
      return { code: json.error, message: json.error, fields: undefined }
    }
  } catch {
    return { code: fallback.code, message: text, fields: undefined }
  }

  return fallback
}
