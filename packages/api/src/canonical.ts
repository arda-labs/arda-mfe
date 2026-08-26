import { api, type ApiRequestOptions, type ApiSuccess } from "./index"
import type { ListResponse } from "./list"

/**
 * Perform a GET request expecting a canonical SuccessEnvelope `{ result: T, success: true, ... }`
 * and unwrap the `result` payload.
 */
export async function getCanonical<T>(
  path: string,
  options?: ApiRequestOptions
): Promise<T> {
  const response = await api.get<ApiSuccess<T>>(path, options)
  return response.result
}

/**
 * Perform a POST request expecting a canonical SuccessEnvelope `{ result: T, success: true, ... }`
 * and unwrap the `result` payload.
 */
export async function postCanonical<T>(
  path: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  const response = await api.post<ApiSuccess<T>>(path, body, options)
  return response.result
}

/**
 * Perform a PUT request expecting a canonical SuccessEnvelope `{ result: T, success: true, ... }`
 * and unwrap the `result` payload.
 */
export async function putCanonical<T>(
  path: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  const response = await api.put<ApiSuccess<T>>(path, body, options)
  return response.result
}

/**
 * Perform a DELETE request expecting a canonical SuccessEnvelope `{ result: T, success: true, ... }`
 * and unwrap the `result` payload if present.
 */
export async function deleteCanonical<T = void>(
  path: string,
  options?: ApiRequestOptions
): Promise<T | undefined> {
  const response = await api.delete<ApiSuccess<T>>(path, options)
  return response?.result
}

/**
 * Perform a GET request for a paginated list resource expecting `{ result: ListResponse<T>, ... }`
 * and unwrap the `result` ListResponse payload.
 */
export async function getCanonicalList<T>(
  path: string,
  options?: ApiRequestOptions
): Promise<ListResponse<T>> {
  const response = await api.get<ApiSuccess<ListResponse<T>>>(path, options)
  return response.result
}
