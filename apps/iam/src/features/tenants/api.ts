import { deleteCanonical, getCanonical, postCanonical } from "@workspace/api"
import type { Tenant, TenantMember } from "./types"

export const tenantsApi = {
  listTenants: () => getCanonical<Tenant[]>("/api/admin/tenants"),
  createTenant: (data: { code: string; name: string; ownerUserId?: string }) =>
    postCanonical<Tenant>("/api/admin/tenants", {
      code: data.code,
      name: data.name,
      owner_user_id: data.ownerUserId,
    }),
  listTenantMembers: (tenantId: string) =>
    getCanonical<TenantMember[]>(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/members`
    ),
  addTenantMember: (tenantId: string, userId: string, isDefault = false) =>
    postCanonical(`/api/admin/tenants/${encodeURIComponent(tenantId)}/members`, {
      user_id: userId,
      is_default: isDefault,
    }),
  removeTenantMember: (tenantId: string, userId: string) =>
    deleteCanonical(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/members/${encodeURIComponent(userId)}`
    ),
}
