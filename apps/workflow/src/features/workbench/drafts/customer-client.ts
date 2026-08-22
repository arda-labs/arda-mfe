import { api } from "@workspace/api"
import { buildSearchParams, type SearchParams } from "@workspace/api/query"

export type CustomerStatus = "DRAFT" | "NEEDS_CHANGES"

export interface Customer {
  id: string
  customerCode: string
  name: string
  status: CustomerStatus
  mobile: string
  identityNo: string
  updatedAt: string
}

export const customerDraftApi = {
  list(status: CustomerStatus) {
    return getItems<Customer>("/api/crm/customers", { status })
  },
  cancel(id: string) {
    return api.post<Customer>(`/api/crm/customers/${encodeURIComponent(id)}/cancel`)
  },
}

async function getItems<T>(path: string, params: SearchParams = {}) {
  const search = buildSearchParams(params)
  const suffix = search.size ? `?${search.toString()}` : ""
  const data = await api.get<T[] | { items?: T[] }>(`${path}${suffix}`)
  return Array.isArray(data) ? data : (data.items ?? [])
}
