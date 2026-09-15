/**
 * Wire/view types for the areas catalog.
 * Wire source: arda-be/apps/platform-service (area handlers).
 */
export interface Area {
  id: string
  tenant_id: string
  parent_id?: string
  code: string
  name: string
  area_type_code: string
  admin_unit_code?: string
  description?: string
  status: "active" | "inactive"
  effective_from?: string
  effective_to?: string
  created_at?: string
  updated_at?: string
}
