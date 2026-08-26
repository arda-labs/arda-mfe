export interface Group {
  id: string
  code: string
  name: string
  description?: string
  status: string
  tenantId: string
  isSystem: boolean
  memberCount: number
  roleCount: number
  createdAt: string
  updatedAt: string
}

export type GroupApiItem = {
  id: string
  code: string
  name: string
  description?: string
  status: string
  tenant_id: string
  is_system: boolean
  member_count: number
  role_count: number
  created_at: string
  updated_at: string
}
