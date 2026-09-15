import { operateQuery, request } from "../internal"
import type { OperateIncidentQuery } from "./queries"

export interface IncidentState {
  incidentKey: string
  processInstanceKey: string
  processDefinitionKey: string
  bpmnProcessId: string
  elementId: string
  elementInstanceKey: string
  jobKey?: string
  errorType: string
  errorMessage: string
  state: "CREATED" | "RESOLVED" | "PENDING"
  createdAt: string
  resolvedAt?: string
  retries?: number
}

export interface OperateIncidentRow {
  incidentKey: string
  processInstanceKey: string
  bpmnProcessId?: string
  elementId?: string
  elementInstanceKey?: string
  jobKey?: string
  errorType?: string
  errorMessage?: string
  state: string
  createdAt?: string
  caseId?: string
  businessKey?: string
}

export interface OperateIncidentPage {
  items: OperateIncidentRow[]
  nextCursor?: string
  source: string
}

export const monitoringIncidentsApi = {
  searchOperateIncidents(params?: OperateIncidentQuery) {
    return request<OperateIncidentPage>(
      `/api/workflow/operate/incidents${operateQuery(params)}`
    )
  },
  retryIncident(incidentKey: string) {
    return request<{ status: string }>(
      `/api/workflow/operate/incidents/${encodeURIComponent(incidentKey)}/retry`,
      { method: "POST" }
    )
  },
  resolveIncident(incidentKey: string) {
    return request<{ status: string }>(
      `/api/workflow/operate/incidents/${encodeURIComponent(incidentKey)}/resolve`,
      { method: "POST" }
    )
  },
}
