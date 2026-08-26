export interface Tenant {
  id: string
  code: string
  name: string
  status: string
  createdAt?: string
  updatedAt?: string
}

export interface TenantMember {
  userId: string
  username: string
  email: string
  displayName: string
  status: string
  isDefault: boolean
}
