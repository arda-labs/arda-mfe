/**
 * Wire/view types for the parameters screen.
 * The parameter shape is the platform reference type (ADR-005): declared once
 * in @workspace/api/reference/platform. Only the literal unions the form
 * offers are narrowed here.
 */
import type { PlatformParameter } from "@workspace/api/reference/platform"

export type ParameterValueType = "string" | "number" | "boolean" | "json" | "date"
export type ParameterScopeType = "global" | "tenant" | "org" | "branch" | "department"

export type Parameter = Omit<PlatformParameter, "value_type" | "scope_type"> & {
  value_type: ParameterValueType
  scope_type: ParameterScopeType
}
