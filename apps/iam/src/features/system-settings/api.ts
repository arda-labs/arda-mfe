import { api, type ApiSuccess } from "@workspace/api"
import type { PlatformParameter } from "@workspace/api/reference/platform"

/** Platform reference type (ADR-005); narrowed to the unions this form offers. */
export type Parameter = Omit<PlatformParameter, "value_type" | "scope_type"> & {
  value_type: "string" | "number" | "boolean" | "json" | "date"
  scope_type: "global" | "tenant" | "org" | "branch" | "department"
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
