import { operateQuery, request } from "../internal"
import type { OperateJob } from "./jobs"
import type { OperateInstanceQuery } from "./queries"

export interface ProcessInstanceState {
  processInstanceKey: string
  processDefinitionKey: string
  bpmnProcessId: string
  version: number
  businessKey?: string
  state: "ACTIVE" | "COMPLETED" | "CANCELED" | "SUSPENDED" | "INCIDENT"
  elementId?: string
  startTime: string
  endTime?: string
  runningDuration?: string
  variables?: Record<string, unknown>
}

export interface ElementInstanceStat {
  bpmnProcessId: string
  elementId: string
  elementName: string
  elementType: string
  activeCount: number
  completedCount: number
  incidentCount: number
  totalCount: number
}

export interface ProcessDefinitionOperate {
  id: string
  processCode: string
  name: string
  bpmnProcessId: string
  version: number
  resourceName: string
  status: string
  deploymentKey?: number
  deployedAt?: string
  instanceCount: number
  incidentCount: number
  activeCount: number
  elementStats: ElementInstanceStat[]
}

export interface ProcessMetric {
  label: string
  value: string
  tone: "default" | "success" | "warning" | "error"
}

// --- Runtime monitoring read model (Zeebe exporter backed) ---

export interface OperateInstance {
  processInstanceKey: string
  processDefinitionKey?: string
  bpmnProcessId: string
  version: number
  state: string
  startTime: string
  endTime?: string
  parentProcessInstanceKey?: string
  caseId?: string
  businessKey?: string
  caseType?: string
  caseStatus?: string
  openIncidents: number
}

export interface OperateInstancePage {
  items: OperateInstance[]
  nextCursor?: string
  source: string
}

export interface OperateInstanceDetail extends OperateInstance {
  title?: string
  slaDueAt?: string
}

export interface OperateElementInstance {
  elementInstanceKey: string
  elementId: string
  bpmnElementType: string
  state: string
  startTime: string
  endTime?: string
  flowScopeKey?: string
}

export interface OperateVariable {
  name: string
  value: string
  scopeKey: string
  updatedAt: string
}

export interface OperateHistoryEvent {
  position: string
  timestamp: string
  valueType: string
  intent: string
  elementId?: string
  jobType?: string
  errorMessage?: string
  variableName?: string
  variableValue?: string
  userTaskKey?: string
}

export interface OperateHistoryPage {
  items: OperateHistoryEvent[]
  nextCursor?: string
}

export const monitoringInstancesApi = {
  listOperateProcessDefinitions() {
    return request<ProcessDefinitionOperate[]>(
      "/api/workflow/operate/process-definitions"
    )
  },
  searchOperateInstances(params?: OperateInstanceQuery) {
    return request<OperateInstancePage>(
      `/api/workflow/operate/process-instances${operateQuery(params)}`
    )
  },
  getOperateInstanceDetail(key: string) {
    return request<OperateInstanceDetail>(
      `/api/workflow/operate/process-instances/${encodeURIComponent(key)}`
    )
  },
  listInstanceElementInstances(key: string) {
    return request<OperateElementInstance[]>(
      `/api/workflow/operate/process-instances/${encodeURIComponent(key)}/element-instances`
    )
  },
  listInstanceVariables(key: string) {
    return request<OperateVariable[]>(
      `/api/workflow/operate/process-instances/${encodeURIComponent(key)}/variables`
    )
  },
  setInstanceVariables(
    key: string,
    variables: Record<string, unknown>,
    options?: { elementInstanceKey?: string; local?: boolean }
  ) {
    return request<{ status: string; elementInstanceKey: string }>(
      `/api/workflow/operate/process-instances/${encodeURIComponent(key)}/variables`,
      {
        method: "POST",
        body: {
          variables,
          elementInstanceKey: options?.elementInstanceKey
            ? Number(options.elementInstanceKey)
            : undefined,
          local: options?.local,
        },
      }
    )
  },
  listInstanceJobs(key: string) {
    return request<OperateJob[]>(
      `/api/workflow/operate/process-instances/${encodeURIComponent(key)}/jobs`
    )
  },
  listInstanceHistory(key: string, cursor?: string) {
    const query = cursor
      ? `?cursor=${encodeURIComponent(cursor)}&limit=50`
      : "?limit=50"
    return request<OperateHistoryPage>(
      `/api/workflow/operate/process-instances/${encodeURIComponent(key)}/history${query}`
    )
  },
  listElementInstanceStats(bpmnProcessId?: string) {
    const path =
      "/api/workflow/operate/element-stats" +
      (bpmnProcessId
        ? `?bpmnProcessId=${encodeURIComponent(bpmnProcessId)}`
        : "")
    return request<ElementInstanceStat[]>(path)
  },
  pauseProcessInstance(key: string) {
    return request<{ status: string }>(
      `/api/workflow/operate/process-instances/${encodeURIComponent(key)}/pause`,
      { method: "POST" }
    )
  },
  resumeProcessInstance(key: string) {
    return request<{ status: string }>(
      `/api/workflow/operate/process-instances/${encodeURIComponent(key)}/resume`,
      { method: "POST" }
    )
  },
  cancelProcessInstance(key: string) {
    return request<{ status: string }>(
      `/api/workflow/operate/process-instances/${encodeURIComponent(key)}/cancel`,
      { method: "POST" }
    )
  },
  deleteProcessInstance(key: string) {
    return request<void>(
      `/api/workflow/operate/process-instances/${encodeURIComponent(key)}`,
      { method: "DELETE" }
    )
  },
}
