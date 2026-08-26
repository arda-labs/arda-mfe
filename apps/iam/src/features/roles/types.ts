import type { Permission, PermissionApiItem } from "../permissions/types"

export interface Role {
  id: string
  code: string
  name: string
  status: string
  tenantId: string
  permissions?: Permission[]
}

export type RoleApiItem = {
  id: string
  code: string
  name: string
  status: string
  tenant_id: string
  permissions?: PermissionApiItem[]
}
