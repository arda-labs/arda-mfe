import { api, type ApiSuccess } from "@workspace/api"
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
    return getCanonicalItems<Customer>(`/api/crm/customers?${search.toString()}`)
  },
  get(id: string) {
    return requestCanonical<Customer>(`/api/crm/customers/${encodeURIComponent(id)}`, {
      method: "GET",
    })
  },
  save(payload: CustomerPayload) {
    if (payload.id) {
      return requestCanonical<Customer>(
        `/api/crm/customers/${encodeURIComponent(payload.id)}`,
        {
          method: "PUT",
          body: payload,
        }
      )
    }
    return requestCanonical<Customer>("/api/crm/customers", {
      method: "POST",
      body: payload,
    })
  },
  submit(id: string) {
    return requestCanonical<Customer>(
      `/api/crm/customers/${encodeURIComponent(id)}/submit`,
      { method: "POST" }
    )
  },
  cancel(id: string) {
    return requestCanonical<Customer>(
      `/api/crm/customers/${encodeURIComponent(id)}/cancel`,
      { method: "POST" }
    )
  },
  listRelationships(customerId: string) {
    return getCanonicalItems<CustomerRelationship>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/relationships`
    )
  },
  createRelationship(customerId: string, payload: CustomerRelationshipPayload) {
    return requestCanonical<CustomerRelationship>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/relationships`,
      {
        method: "POST",
        body: payload,
      }
    )
  },
  listTasks(role: WorkflowTaskRole) {
    return getItems<WorkflowTask>("/api/workflow/tasks", { role, limit: 10 })
  },
  claimWorkflowTask(input: {
    role: WorkflowTaskRole
    taskType?: string
    processInstanceKey?: string
    caseId?: string | null
    elementId?: string | null
  }) {
    return requestCanonical<WorkflowTask>("/api/workflow/tasks/claim", {
      method: "POST",
      body: input,
    })
  },
  getWorkflowWorkItem(id: string) {
    return requestCanonical<WorkflowWorkItem>(
      `/api/workflow/work-items/${encodeURIComponent(id)}`,
      { method: "GET" }
    )
  },
  getWorkflowCase(id: string) {
    return requestCanonical<WorkflowCase>(
      `/api/workflow/cases/${encodeURIComponent(id)}`,
      { method: "GET" }
    )
  },
  getTaskReadiness(caseId: string, stepCode: string) {
    return requestCanonical<{ ready: boolean; status: string }>(
      `/api/workflow/cases/${encodeURIComponent(caseId)}/task-readiness?stepCode=${encodeURIComponent(stepCode)}`,
      { method: "GET" }
    )
  },
  getWorkflowCaseTimeline(id: string) {
    return requestCanonical<WorkflowTimelineEvent[]>(
      `/api/workflow/cases/${encodeURIComponent(id)}/timeline`,
      {
      method: "GET",
      }
    )
  },
  completeTask(input: {
    jobKey: string
    processInstanceKey: string
    elementId: string
    variables: Record<string, unknown>
  }) {
    return requestCanonical<{ status: string }>(
      `/api/workflow/tasks/${encodeURIComponent(input.jobKey)}/complete`,
      {
        method: "POST",
        body: {
          processInstanceKey: input.processInstanceKey,
          elementId: input.elementId,
          variables: input.variables,
        },
      }
    )
  },
  getCurrentAmendment(customerId: string) {
    return requestCanonical<CustomerAmendment | null>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/adjustments`,
      { method: "GET" }
    )
  },
  startAdjustment(customerId: string) {
    return requestCanonical<CustomerAmendment>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/adjustments`,
      { method: "POST" }
    )
  },
  updateAmendment(
    customerId: string,
    amendmentId: string,
    payload: AmendmentUpsertPayload
  ) {
    return requestCanonical<CustomerAmendment>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/adjustments/${encodeURIComponent(amendmentId)}`,
      { method: "PUT", body: payload }
    )
  },
  submitAmendment(customerId: string, amendmentId: string) {
    return requestCanonical<CustomerAmendment>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/adjustments/${encodeURIComponent(amendmentId)}/submit`,
      { method: "POST" }
    )
  },
  cancelAmendment(customerId: string, amendmentId: string) {
    return requestCanonical<{ status: string }>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/adjustments/${encodeURIComponent(amendmentId)}/cancel`,
      { method: "POST" }
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
    return api
      .get<ApiSuccess<GeoAdminUnit[]>>(`/api/platform/geo/admin-units${suffix}`)
      .then((res) => res.result)
  },
  listAreas(params?: { status?: string; q?: string; adminUnitCode?: string }) {
    const q = buildSearchParams({
      status: params?.status,
      q: params?.q,
      admin_unit_code: params?.adminUnitCode,
    })
    const suffix = q.size ? `?${q.toString()}` : ""
    return api
      .get<ApiSuccess<PlatformArea[]>>(`/api/platform/areas${suffix}`)
      .then((res) => res.result)
  },
  listOrganizations(params?: { all?: boolean; is_active?: boolean }) {
    const q = buildSearchParams({
      all: params?.all ? "1" : undefined,
      is_active: params?.is_active,
    })
    const suffix = q.size ? `?${q.toString()}` : ""
    return api
      .get<ApiSuccess<ListResponse<PlatformOrganization>>>(
        `/api/platform/organizations${suffix}`
      )
      .then((res) => res.result)
  },
}

async function getItems<T>(path: string, params: SearchParams = {}) {
  const search = buildSearchParams(params)
  const suffix = search.size ? `?${search.toString()}` : ""
  const data = await requestCanonical<{ items: T[] }>(`${path}${suffix}`, {
    method: "GET",
  })
  return data.items
}

type CanonicalMethod = "GET" | "POST" | "PUT" | "DELETE"

async function requestCanonical<T>(
  path: string,
  options: { method: CanonicalMethod; body?: unknown }
): Promise<T> {
  let response: ApiSuccess<T>
  switch (options.method) {
    case "GET":
      response = await api.get<ApiSuccess<T>>(path)
      break
    case "POST":
      response = await api.post<ApiSuccess<T>>(path, options.body)
      break
    case "PUT":
      response = await api.put<ApiSuccess<T>>(path, options.body)
      break
    case "DELETE":
      response = await api.delete<ApiSuccess<T>>(path)
      break
  }
  return response.result
}

async function getCanonicalItems<T>(path: string, params: SearchParams = {}) {
  const search = buildSearchParams(params)
  const suffix = search.size ? `?${search.toString()}` : ""
  const result = await requestCanonical<ListResponse<T>>(`${path}${suffix}`, {
    method: "GET",
  })
  return result.items
}
