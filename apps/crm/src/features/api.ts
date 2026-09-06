import {
  getCanonical,
  getCanonicalList,
  postCanonical,
  putCanonical,
} from "@workspace/api"
import { buildListSearchParams, type ListResponse } from "@workspace/api/list"
import { buildSearchParams, type SearchParams } from "@workspace/api/query"

export type CustomerType = "PERSONAL" | "BUSINESS"
export type CustomerStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "NEEDS_CHANGES"
  | "REJECTED"
  | "APPROVED"
  | "ACTIVE"
  | "PENDING_AMENDMENT"
  | "CANCELLED"
  | "CREATED"
  | "UPDATED"

export type AmendmentStatus = "DRAFT" | "PENDING" | "APPLIED" | "REJECTED"

export interface CustomerAmendment {
  id: string
  customerId: string
  workflowCaseId?: string
  status: AmendmentStatus
  beforeSnapshot?: Record<string, unknown>
  afterSnapshot?: Record<string, unknown>
  changedFields?: string[]
  appliedAt?: string
  appliedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  createdAt: string
  updatedAt: string
}

export interface AmendmentUpsertPayload {
  afterSnapshot: Record<string, unknown>
  changedFields: string[]
}

export interface Customer {
  id: string
  customerCode: string
  workflowCaseId?: string
  customerType: CustomerType
  name: string
  email: string
  status: CustomerStatus
  mobile: string
  identityNo: string
  address: string
  segment: string
  rank: string
  riskLevel: string
  generalInfo: Record<string, unknown>
  personalInfo: Record<string, unknown>
  businessInfo: Record<string, unknown>
  extendedInfo: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CustomerPayload {
  id?: string
  customerType: CustomerType
  name: string
  email: string
  status: CustomerStatus
  mobile: string
  identityNo: string
  address: string
  segment: string
  rank: string
  riskLevel: string
  generalInfo: Record<string, unknown>
  personalInfo: Record<string, unknown>
  businessInfo: Record<string, unknown>
  extendedInfo: Record<string, unknown>
}

export interface CustomerRelationship {
  id: string
  customerId: string
  relatedCustomerId: string
  relatedCustomerCode?: string
  relatedCustomerName: string
  relatedCustomerAddress: string
  relationType: string
  relationCode: string
  reciprocalRelationCode: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface CustomerRelationshipPayload {
  relatedCustomerId: string
  relationType: string
  relationCode: string
  reciprocalRelationCode: string
  status: string
}

export type CustomerListParams = {
  customerType?: CustomerType
  status?: CustomerStatus
  riskOnly?: boolean
  q?: string
  page?: number
  perPage?: number
}

export type WorkflowTaskRole =
  "CUSTOMER_CHECKER" | "CUSTOMER_RISK_CHECKER" | "CUSTOMER_MAKER"

export interface WorkflowTask {
  jobKey: string
  type: string
  elementId: string
  processInstanceKey: string
  caseId: string
  caseCode: string
  customerId: string
  customerName: string
  candidateRole: string
  formKey: string
  variables: Record<string, unknown>
}

export interface WorkflowWorkItem {
  id: string
  caseId: string
  caseCode: string
  primaryObjectId?: string
  processInstanceKey?: string | number
  jobKey?: string | number
  stepCode?: string
  candidateRole?: string
}

export interface WorkflowCase {
  id: string
  caseCode: string
  caseType: string
  primaryObjectId?: string
  processInstanceKey?: string | number
  currentStep?: string
  candidateRole?: string
  status: string
}

export interface WorkflowTimelineEvent {
  id: number
  caseId: string
  eventType: string
  note: string
  actor?: string | null
  createdAt: string
}

export const customerApi = {
  list(params: CustomerListParams = {}) {
    const search = buildListSearchParams({
      page: params.page,
      perPage: params.perPage,
      q: params.q,
      customer_type: params.customerType,
      status: params.status,
      risk_only: params.riskOnly,
    })
    return getCanonicalList<Customer>(`/api/crm/customers?${search.toString()}`).then(
      (res) => res.items
    )
  },
  get(id: string) {
    return getCanonical<Customer>(`/api/crm/customers/${encodeURIComponent(id)}`)
  },
  save(payload: CustomerPayload) {
    if (payload.id) {
      return putCanonical<Customer>(
        `/api/crm/customers/${encodeURIComponent(payload.id)}`,
        payload
      )
    }
    return postCanonical<Customer>("/api/crm/customers", payload)
  },
  submit(id: string) {
    return postCanonical<Customer>(
      `/api/crm/customers/${encodeURIComponent(id)}/submit`
    )
  },
  cancel(id: string) {
    return postCanonical<Customer>(
      `/api/crm/customers/${encodeURIComponent(id)}/cancel`
    )
  },
  listRelationships(customerId: string) {
    return getCanonicalList<CustomerRelationship>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/relationships`
    ).then((res) => res.items)
  },
  createRelationship(customerId: string, payload: CustomerRelationshipPayload) {
    return postCanonical<CustomerRelationship>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/relationships`,
      payload
    )
  },
  getWorkflowWorkItem(id: string) {
    return getCanonical<WorkflowWorkItem>(
      `/api/workflow/work-items/${encodeURIComponent(id)}`
    )
  },
  getWorkflowCase(id: string) {
    return getCanonical<WorkflowCase>(
      `/api/workflow/cases/${encodeURIComponent(id)}`
    )
  },
  getTaskReadiness(caseId: string, stepCode: string) {
    return getCanonical<{ ready: boolean; status: string }>(
      `/api/workflow/cases/${encodeURIComponent(caseId)}/task-readiness?stepCode=${encodeURIComponent(stepCode)}`
    )
  },
  getWorkflowCaseTimeline(id: string) {
    return getCanonical<WorkflowTimelineEvent[]>(
      `/api/workflow/cases/${encodeURIComponent(id)}/timeline`
    )
  },
  completeTask(input: {
    jobKey: string
    processInstanceKey: string
    elementId: string
    variables: Record<string, unknown>
  }) {
    return postCanonical<{ status: string }>(
      `/api/workflow/tasks/${encodeURIComponent(input.jobKey)}/complete`,
      {
        processInstanceKey: input.processInstanceKey,
        elementId: input.elementId,
        variables: input.variables,
      }
    )
  },
  getCurrentAmendment(customerId: string) {
    return getCanonical<CustomerAmendment | null>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/adjustments`
    )
  },
  startAdjustment(customerId: string) {
    return postCanonical<CustomerAmendment>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/adjustments`
    )
  },
  updateAmendment(
    customerId: string,
    amendmentId: string,
    payload: AmendmentUpsertPayload
  ) {
    return putCanonical<CustomerAmendment>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/adjustments/${encodeURIComponent(amendmentId)}`,
      payload
    )
  },
  submitAmendment(customerId: string, amendmentId: string) {
    return postCanonical<CustomerAmendment>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/adjustments/${encodeURIComponent(amendmentId)}/submit`
    )
  },
  cancelAmendment(customerId: string, amendmentId: string) {
    return postCanonical<{ status: string }>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/adjustments/${encodeURIComponent(amendmentId)}/cancel`
    )
  },
}

export interface GeoAdminUnit {
  code: string
  name: string
  full_name?: string
  parent_code?: string
  level: number
  unit_type: string
  is_active: boolean
}

export interface PlatformArea {
  id: string
  code: string
  name: string
  area_type_code: string
  admin_unit_code?: string
  status: "active" | "inactive"
}

export interface PlatformOrganization {
  id: string
  code: string
  name: string
  is_active: boolean
}

export const platformReferenceApi = {
  listGeoAdminUnits(params?: { parentCode?: string; level?: number }) {
    const q = buildSearchParams({
      parent_code: params?.parentCode,
      level: params?.level,
    })
    const suffix = q.size ? `?${q.toString()}` : ""
    return getCanonical<GeoAdminUnit[]>(`/api/platform/geo/admin-units${suffix}`)
  },
  listAreas(params?: { status?: string; q?: string; adminUnitCode?: string }) {
    const q = buildSearchParams({
      status: params?.status,
      q: params?.q,
      admin_unit_code: params?.adminUnitCode,
    })
    const suffix = q.size ? `?${q.toString()}` : ""
    return getCanonical<PlatformArea[]>(`/api/platform/areas${suffix}`)
  },
  listOrganizations(params?: { all?: boolean; is_active?: boolean }) {
    const q = buildSearchParams({
      all: params?.all ? "1" : undefined,
      is_active: params?.is_active,
    })
    const suffix = q.size ? `?${q.toString()}` : ""
    return getCanonical<ListResponse<PlatformOrganization>>(
      `/api/platform/organizations${suffix}`
    )
  },
}

async function getItems<T>(path: string, params: SearchParams = {}) {
  const search = buildSearchParams(params)
  const suffix = search.size ? `?${search.toString()}` : ""
  const data = await getCanonical<{ items: T[] }>(`${path}${suffix}`)
  return data.items
}
