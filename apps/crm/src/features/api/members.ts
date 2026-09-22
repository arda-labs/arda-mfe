import { buildSearchParams } from "@workspace/api/query"
import { getCanonical, getCanonicalList, postCanonical, putCanonical } from "@workspace/api"

/** QTDND membership API (thành viên / vốn góp cổ phần). Wire types are
 * snake_case per docs/conventions/feature-structure.md. */
export interface CrmMember {
  id: string
  member_code: string
  customer_code: string
  org_code?: string
  member_book_no?: string
  member_type_code: string
  open_date: string
  estb_capital_minor: number
  add_capital_minor: number
  total_capital_minor: number
  member_status: string
  leave_date?: string
  workflow_case_id?: string
  version: number
}

export interface CrmMemberRequest {
  id: string
  member_id: string
  request_type: "REGISTER" | "ADDITIONAL" | "WITHDRAW"
  product_code?: string
  amount_minor: number
  currency_code: string
  effective_date?: string
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED"
  reason?: string
  workflow_case_id?: string
  submitted_at?: string
  decided_by?: string
  decided_at?: string
  version: number
}

export function listCrmMembers(
  params: { q?: string; status?: string; member_type_code?: string } = {}
) {
  const q = buildSearchParams({
    q: params.q,
    status: params.status,
    member_type_code: params.member_type_code,
  })
  const suffix = q.size ? `?${q.toString()}` : ""
  return getCanonicalList<CrmMember>(`/api/crm/members${suffix}`)
}

export function getCrmMember(id: string) {
  return getCanonical<CrmMember>(`/api/crm/members/${encodeURIComponent(id)}`)
}

export function registerCrmMember(body: {
  member_code?: string
  customer_code: string
  org_code?: string
  member_book_no?: string
  member_type_code: string
  open_date: string
  estb_capital_minor: number
}) {
  return postCanonical<CrmMember>("/api/crm/members", body)
}

export function updateCrmMember(
  id: string,
  body: {
    member_book_no?: string
    member_type_code: string
    member_status: string
    version: number
  }
) {
  return putCanonical<CrmMember>(`/api/crm/members/${encodeURIComponent(id)}`, body)
}

export function listCrmMemberRequests(params: { member_id?: string; status?: string } = {}) {
  const q = buildSearchParams({ member_id: params.member_id, status: params.status })
  const suffix = q.size ? `?${q.toString()}` : ""
  return getCanonicalList<CrmMemberRequest>(`/api/crm/member-requests${suffix}`)
}

export function submitCrmMemberRequest(body: {
  member_id: string
  request_type: "REGISTER" | "ADDITIONAL" | "WITHDRAW"
  amount_minor: number
  effective_date?: string
  reason?: string
  idempotency_key?: string
}) {
  return postCanonical<CrmMemberRequest>("/api/crm/member-requests", body)
}

export function decideCrmMemberRequest(
  id: string,
  body: { decision: "APPROVED" | "REJECTED"; data_version?: number }
) {
  return postCanonical<{ request: CrmMemberRequest; member?: CrmMember }>(
    `/api/crm/member-requests/${encodeURIComponent(id)}/decision`,
    body
  )
}
