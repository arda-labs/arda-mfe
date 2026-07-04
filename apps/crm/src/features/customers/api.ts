export type CustomerType = "PERSONAL" | "BUSINESS"
export type CustomerStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "NEEDS_CHANGES"
  | "REJECTED"
  | "APPROVED"
  | "CREATED"
  | "UPDATED"

export interface Customer {
  id: string
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
  id: string
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
}

export type WorkflowTaskRole =
  "CUSTOMER_CHECKER" | "CUSTOMER_RISK_CHECKER" | "CUSTOMER_MAKER"

export interface WorkflowTask {
  jobKey: number
  type: string
  elementId: string
  processInstanceKey: number
  caseId: string
  caseCode: string
  customerId: string
  customerName: string
  candidateRole: string
  formKey: string
  variables: Record<string, unknown>
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
  completeTask(input: {
    jobKey: number
    processInstanceKey: number
    elementId: string
    variables: Record<string, unknown>
  }) {
    return request<{ status: string }>(
      `/api/workflow/tasks/${encodeURIComponent(String(input.jobKey))}/complete`,
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
  const response = await fetch(path, {
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
