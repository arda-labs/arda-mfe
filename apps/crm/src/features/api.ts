import { api } from "@workspace/api"
import type { ListResponse } from "@workspace/api/list"
import { apiUrl } from "@workspace/api/url"

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
  limit?: number
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
    return getItems<Customer>("/api/crm/customers", params)
  },
  get(id: string) {
    return request<Customer>(`/api/crm/customers/${encodeURIComponent(id)}`, {
      method: "GET",
    })
  },
  save(payload: CustomerPayload) {
    if (payload.id) {
      return request<Customer>(
        `/api/crm/customers/${encodeURIComponent(payload.id)}`,
        {
          method: "PUT",
          body: payload,
        }
      )
    }
    return request<Customer>("/api/crm/customers", {
      method: "POST",
      body: payload,
    })
  },
  submit(id: string) {
    return request<Customer>(
      `/api/crm/customers/${encodeURIComponent(id)}/submit`,
      { method: "POST" }
    )
  },
  cancel(id: string) {
    return request<Customer>(
      `/api/crm/customers/${encodeURIComponent(id)}/cancel`,
      { method: "POST" }
    )
  },
  listRelationships(customerId: string) {
    return getItems<CustomerRelationship>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/relationships`
    )
  },
  createRelationship(customerId: string, payload: CustomerRelationshipPayload) {
    return request<CustomerRelationship>(
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
    return request<WorkflowTask>("/api/workflow/tasks/claim", {
      method: "POST",
      body: input,
    })
  },
  getWorkflowWorkItem(id: string) {
    return request<WorkflowWorkItem>(
      `/api/workflow/work-items/${encodeURIComponent(id)}`,
      { method: "GET" }
    )
  },
  getWorkflowCase(id: string) {
    return request<WorkflowCase>(
      `/api/workflow/cases/${encodeURIComponent(id)}`,
      { method: "GET" }
    )
  },
  getTaskReadiness(caseId: string, stepCode: string) {
    return request<{ ready: boolean; status: string }>(
      `/api/workflow/cases/${encodeURIComponent(caseId)}/task-readiness?stepCode=${encodeURIComponent(stepCode)}`,
      { method: "GET" }
    )
  },
  getWorkflowCaseTimeline(id: string) {
    return request<
      { items?: WorkflowTimelineEvent[] } | WorkflowTimelineEvent[]
    >(`/api/workflow/cases/${encodeURIComponent(id)}/timeline`, {
      method: "GET",
    }).then((res) => (Array.isArray(res) ? res : (res.items ?? [])))
  },
  completeTask(input: {
    jobKey: string
    processInstanceKey: string
    elementId: string
    variables: Record<string, unknown>
  }) {
    return request<{ status: string }>(
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
    return request<CustomerAmendment | null>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/adjustments`,
      { method: "GET" }
    )
  },
  startAdjustment(customerId: string) {
    return request<CustomerAmendment>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/adjustments`,
      { method: "POST" }
    )
  },
  updateAmendment(
    customerId: string,
    amendmentId: string,
    payload: AmendmentUpsertPayload
  ) {
    return request<CustomerAmendment>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/adjustments/${encodeURIComponent(amendmentId)}`,
      { method: "PUT", body: payload }
    )
  },
  submitAmendment(customerId: string, amendmentId: string) {
    return request<CustomerAmendment>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/adjustments/${encodeURIComponent(amendmentId)}/submit`,
      { method: "POST" }
    )
  },
  cancelAmendment(customerId: string, amendmentId: string) {
    return request<{ status: string }>(
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
    const q = new URLSearchParams()
    if (params?.parentCode) q.set("parent_code", params.parentCode)
    if (params?.level) q.set("level", String(params.level))
    const suffix = q.size ? `?${q.toString()}` : ""
    return api.get<GeoAdminUnit[]>(`/api/platform/geo/admin-units${suffix}`)
  },
  listAreas(params?: { status?: string; q?: string; adminUnitCode?: string }) {
    const q = new URLSearchParams()
    if (params?.status) q.set("status", params.status)
    if (params?.q) q.set("q", params.q)
    if (params?.adminUnitCode) q.set("admin_unit_code", params.adminUnitCode)
    const suffix = q.size ? `?${q.toString()}` : ""
    return api.get<PlatformArea[]>(`/api/platform/areas${suffix}`)
  },
  listOrganizations(params?: { all?: boolean; is_active?: boolean }) {
    const q = new URLSearchParams()
    if (params?.all) q.set("all", "1")
    if (params?.is_active !== undefined) {
      q.set("is_active", String(params.is_active))
    }
    const suffix = q.size ? `?${q.toString()}` : ""
    return api.get<ListResponse<PlatformOrganization>>(
      `/api/platform/organizations${suffix}`
    )
  },
}

async function getItems<T>(path: string, params: Record<string, unknown> = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value))
  })
  const suffix = search.size ? `?${search.toString()}` : ""
  const data = await request<T[] | { items?: T[] }>(`${path}${suffix}`, {
    method: "GET",
  })
  return Array.isArray(data) ? data : (data.items ?? [])
}

async function request<T>(
  path: string,
  options: { method: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown }
) {
  const response = await fetch(apiUrl(path), {
    method: options.method,
    credentials: "include",
    headers:
      options.body === undefined
        ? undefined
        : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  if (!response.ok) {
    const message = await response.text().catch(() => "")
    throw new Error(message || `Request failed with status ${response.status}`)
  }
  return (await response.json()) as T
}
