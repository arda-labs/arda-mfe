import { operateQuery, request } from "../internal"
import type { OperateUserTaskQuery } from "./queries"

export interface OperateUserTaskRow {
  userTaskKey: string
  elementId?: string
  elementInstanceKey?: string
  processInstanceKey: string
  bpmnProcessId?: string
  state: string
  assignee?: string
  candidateGroups?: string[]
  priority?: number
  dueDate?: string
  followUpDate?: string
  createdAt?: string
  caseId?: string
  businessKey?: string
}

export interface OperateUserTaskPage {
  items: OperateUserTaskRow[]
  nextCursor?: string
  source: string
}

export interface OperateSummaryCount {
  label: string
  count: number
}

export interface OperateSummary {
  activeInstances: number
  openIncidents: number
  failedJobs: number
  truncated: boolean
  incidentsByType: OperateSummaryCount[]
  failedJobsByType: OperateSummaryCount[]
  instancesByProcess: OperateSummaryCount[]
}

export const monitoringTasksApi = {
  searchOperateUserTasks(params?: OperateUserTaskQuery) {
    return request<OperateUserTaskPage>(
      `/api/workflow/operate/user-tasks${operateQuery(params)}`
    )
  },
  assignUserTask(key: string, assignee?: string) {
    return request<{ status: string; assignee: string }>(
      `/api/workflow/operate/user-tasks/${encodeURIComponent(key)}/assign`,
      { method: "POST", body: assignee ? { assignee } : {} }
    )
  },
  getOperateSummary() {
    return request<OperateSummary>("/api/workflow/operate/summary")
  },
}
