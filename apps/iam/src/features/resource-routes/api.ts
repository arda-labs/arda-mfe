import { getCanonicalList } from "@workspace/api"

export interface PolicyRoute {
  id: string
  path: string
  methods?: string[]
  auth: boolean
  risk?: string
  permissions?: string[]
}

/** Route-policy browser (resource-management, W6a) — read-only. */
export function listPolicyRoutes() {
  return getCanonicalList<PolicyRoute>("/api/admin/policy-routes")
}
