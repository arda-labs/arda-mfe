import { listParamsToQuery, request, requestList } from "./internal"
import type { WorkflowCaseType } from "./cases"
import type { WorkflowListParams } from "./types"

export interface SlaPolicy {
  id: string
  code: string
  name: string
  caseType: string
  dueInHours: number
  warningInHours: number
  escalationRole: string
  status: string
  effectiveFrom?: string
  effectiveTo?: string
  taskPolicies?: SlaTaskPolicy[]
}

export interface SlaTaskPolicy {
  id?: string
  slaPolicyId?: string
  stepCode: string
  taskName: string
  durationValue: number
  durationUnit: "MINUTE" | "HOUR"
  warningMode: "ABSOLUTE" | "PERCENT"
  warningValue: number
  warningUnit: "MINUTE" | "HOUR" | "PERCENT"
  escalationRole: string
  sortOrder: number
  status: string
  effectiveFrom?: string
  effectiveTo?: string
}

export interface DescriptionTemplate {
  id: string
  code: string
  businessSubsystem: string
  caseType: string
  pattern: string
  preview: string
  status: string
}

export const caseConfigApi = {
  async listSlaPolicies(params?: WorkflowListParams) {
    return requestList<SlaPolicy>(
      `/api/workflow/sla-policies${listParamsToQuery(params)}`
    )
  },
  async listDescriptionTemplates(params?: WorkflowListParams) {
    return requestList<DescriptionTemplate>(
      `/api/workflow/description-templates${listParamsToQuery(params)}`
    )
  },
  updateProcessConfig(caseType: string, payload: Partial<WorkflowCaseType>) {
    return request<WorkflowCaseType>(
      `/api/workflow/case-types/${encodeURIComponent(caseType)}/process-config`,
      { method: "PUT", body: payload }
    )
  },
  createSlaPolicy(payload: Omit<SlaPolicy, "id" | "createdAt" | "updatedAt">) {
    return request<SlaPolicy>("/api/workflow/sla-policies", {
      method: "POST",
      body: payload,
    })
  },
  updateSlaPolicy(
    id: string,
    payload: Omit<SlaPolicy, "id" | "createdAt" | "updatedAt">
  ) {
    return request<SlaPolicy>(
      `/api/workflow/sla-policies/${encodeURIComponent(id)}`,
      { method: "PUT", body: payload }
    )
  },
  createDescriptionTemplate(
    payload: Omit<DescriptionTemplate, "id" | "createdAt" | "updatedAt">
  ) {
    return request<DescriptionTemplate>("/api/workflow/description-templates", {
      method: "POST",
      body: payload,
    })
  },
  updateDescriptionTemplate(
    id: string,
    payload: Omit<DescriptionTemplate, "id" | "createdAt" | "updatedAt">
  ) {
    return request<DescriptionTemplate>(
      `/api/workflow/description-templates/${encodeURIComponent(id)}`,
      { method: "PUT", body: payload }
    )
  },
}
