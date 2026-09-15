/**
 * Wire/view types for the organizations screen.
 * Wire source: arda-be/apps/platform-service (organizations handlers).
 */
import type { ListQueryInput } from "@workspace/api/list"

export interface Organization {
  id: string
  tenant_id: string
  parent_id?: string
  parent_name?: string
  code: string
  name: string
  admin_unit_code?: string
  address?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export type OrganizationsListParams = ListQueryInput & {
  is_active?: string
}
