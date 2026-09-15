/**
 * Wire/view types for the parameters screen.
 * Wire source: arda-be/apps/platform-service (parameters handlers).
 */
export interface Parameter {
  id: string
  tenant_id?: string
  key: string
  value: string
  value_type: "string" | "number" | "boolean" | "json" | "date"
  scope_type: "global" | "tenant" | "org" | "branch" | "department"
  scope_id?: string
  description?: string
  is_secret: boolean
  created_at?: string
  updated_at?: string
}
