/**
 * Wire/view types for the lookups catalogs (categories + values).
 * Wire source: arda-be/apps/platform-service (lookup handlers).
 */
export interface LookupCategory {
  id: string
  tenant_id?: string
  code: string
  name: string
  scope_type: "global" | "tenant" | "org" | "branch" | "department"
  scope_id?: string
  is_system: boolean
  description?: string
  created_at?: string
  updated_at?: string
}

export interface LookupValue {
  id: string
  category_id: string
  code: string
  name: string
  sort_order: number
  is_active: boolean
  metadata?: string
  created_at?: string
  updated_at?: string
}
