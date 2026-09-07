import { deleteCanonical, getCanonical, postCanonical } from "@workspace/api"
import { buildListSearchParams, type ListResponse } from "@workspace/api/list"
import type { Tenant, TenantMember } from "./types"

export type TenantListInput = {
  page?: number
  perPage?: number
  q?: string
  sort?: string
  order?: "asc" | "desc" | string
}

export function buildTenantListQuery(params?: TenantListInput): URLSearchParams {
  const order =
    params?.order?.toLowerCase() === "desc"
      ? "desc"
      : params?.order
        ? "asc"
        : undefined
  return buildListSearchParams({
    page: params?.page,
    perPage: params?.perPage,
    q: params?.q,
    sort: params?.sort,
    order,
  })
}

export const tenantsApi = {
  listTenants: (params?: TenantListInput) =>
    getCanonical<ListResponse<Tenant>>(
      `/api/admin/tenants?${buildTenantListQuery(params).toString()}`
    ),
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
