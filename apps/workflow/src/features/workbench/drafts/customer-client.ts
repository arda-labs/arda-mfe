import { api } from "@workspace/api"

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

async function getItems<T>(path: string, params: Record<string, unknown> = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value))
  })
  const suffix = search.size ? `?${search.toString()}` : ""
  const data = await api.get<T[] | { items?: T[] }>(`${path}${suffix}`)
  return Array.isArray(data) ? data : (data.items ?? [])
}
