import { api, type ApiSuccess } from "@workspace/api"

export type Parameter = {
  id: string
  key: string
  value: string
  value_type: "string" | "number" | "boolean" | "json" | "date"
  scope_type: "global" | "tenant" | "org" | "branch" | "department"
  description?: string
  is_secret: boolean
}

/** Global parameters used by the system-settings screen (platform-service). */
export function listParameters() {
  return api
    .get<ApiSuccess<Parameter[]>>("/api/platform/parameters")
    .then((res) => res.result)
}

export function upsertParameter(
  body: Partial<Parameter> &
    Pick<Parameter, "key" | "value" | "value_type" | "scope_type" | "is_secret">
) {
  return api
    .post<ApiSuccess<Parameter>>("/api/platform/parameters", body)
    .then((res) => res.result)
}
