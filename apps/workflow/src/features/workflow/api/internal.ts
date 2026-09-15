import { api, type ApiSuccess } from "@workspace/api"
import type {
  OperateIncidentQuery,
  OperateInstanceQuery,
  OperateJobQuery,
  OperateUserTaskQuery,
} from "./monitoring/queries"
import type { WorkflowListParams } from "./types"

/**
 * Internal transport helpers for the workflow api modules — not part of the
 * public surface (index.ts re-exports only the query builders used by tests).
 */

export function listParamsToQuery(params?: WorkflowListParams) {
  if (!params) return ""
  const search = new URLSearchParams()
  if (params.q) search.set("q", params.q)
  if (params.sort) search.set("sort", params.sort)
  if (params.order) search.set("order", params.order)
  const raw = search.toString()
  return raw ? `?${raw}` : ""
}

export function operateQuery(
  params?:
    | OperateInstanceQuery
    | OperateIncidentQuery
    | OperateJobQuery
    | OperateUserTaskQuery
) {
  if (!params) return ""
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue
    search.set(key, String(value))
  }
  const raw = search.toString()
  return raw ? `?${raw}` : ""
}

export async function request<T>(
  path: string,
  options?: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown }
) {
  const method = options?.method ?? "GET"
  switch (method) {
    case "GET":
      return api.get<ApiSuccess<T>>(path).then((response) => response.result)
    case "POST":
      return api
        .post<ApiSuccess<T>>(path, options?.body)
        .then((response) => response.result)
    case "PUT":
      return api
        .put<ApiSuccess<T>>(path, options?.body)
        .then((response) => response.result)
    case "DELETE":
      return api.delete<ApiSuccess<T>>(path).then((response) => response.result)
  }
}

export async function requestList<T>(
  path: string,
  options?: { method?: "GET"; body?: unknown }
): Promise<T[]> {
  const result = await request<{ items: T[] }>(path, options)
  return result.items
}

export async function requestText(path: string) {
  return api.getText(path)
}
