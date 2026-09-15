import { getCanonical, getCanonicalList, postCanonical } from "@workspace/api"
import { buildSearchParams } from "@workspace/api/query"

/**
 * Cross-app draft sources for the workbench (owner services: crm, finance, hrm).
 * Types stay with the draft mapping modules — these helpers are transport only.
 */

export function listCustomerDrafts<T>(status: string) {
  const search = new URLSearchParams({ status })
  return getCanonical<{ items: T[] }>(
    `/api/crm/customers?${search.toString()}`
  ).then((res) => res.items)
}

export function cancelCustomerDraft<T>(id: string) {
  return postCanonical<T>(
    `/api/crm/customers/${encodeURIComponent(id)}/cancel`,
    {}
  )
}

export function listFinanceTransactions<T>(
  operation: "incoming" | "outgoing",
  params: { size?: number } = {}
) {
  const search = buildSearchParams(params)
  return getCanonicalList<T>(
    `/api/finance/${operation}-transactions?${search.toString()}`
  )
}

export function listHrmRegistrations<T>(params: { status?: string } = {}) {
  const search = buildSearchParams(params)
  return getCanonicalList<T>(
    `/api/hrm/employee-registrations?${search.toString()}`
  )
}
