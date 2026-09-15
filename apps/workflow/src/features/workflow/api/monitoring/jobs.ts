import { operateQuery, request } from "../internal"
import type { OperateJobQuery } from "./queries"

export interface JobState {
  jobKey: string
  type: string
  processInstanceKey: string
  processDefinitionKey: string
  bpmnProcessId: string
  elementId: string
  elementInstanceKey: string
  state: "ACTIVATABLE" | "ACTIVATED" | "FAILED" | "ERROR_THROWN" | "SUSPENDED"
  retries: number
  maxRetries: number
  createdAt: string
  deadline?: string
  worker?: string
  errorMessage?: string
  customHeaders?: Record<string, string>
}

export interface JobDefinitionState {
  jobDefinitionKey: string
  type: string
  processDefinitionKey: string
  bpmnProcessId: string
  elementId?: string
  elementName?: string
  version?: number
  worker?: string
  state: "ACTIVE" | "SUSPENDED"
  retries: number
  createdAt: string
}

export interface OperateJob {
  jobKey: string
  type: string
  state: string
  retries: number
  worker?: string
  elementId?: string
  elementInstanceKey?: string
  processInstanceKey: string
  bpmnProcessId?: string
  errorMessage?: string
  createdAt: string
  updatedAt?: string
}

export interface OperateJobPage {
  items: OperateJob[]
  nextCursor?: string
  source: string
}

export const monitoringJobsApi = {
  searchOperateJobs(params?: OperateJobQuery) {
    return request<OperateJobPage>(
      `/api/workflow/operate/jobs${operateQuery(params)}`
    )
  },
  listOperateJobDefinitions(bpmnProcessId?: string) {
    const path =
      "/api/workflow/operate/job-definitions" +
      (bpmnProcessId
        ? `?bpmnProcessId=${encodeURIComponent(bpmnProcessId)}`
        : "")
    return request<JobDefinitionState[]>(path)
  },
  updateJobRetries(jobKey: string, retries: number) {
    return request<{ status: string }>(
      `/api/workflow/operate/jobs/${encodeURIComponent(jobKey)}/retries`,
      {
        method: "PUT",
        body: { retries },
      }
    )
  },
  suspendJobDefinition(jobDefinitionKey: string) {
    return request<{ status: string }>(
      `/api/workflow/operate/job-definitions/${encodeURIComponent(jobDefinitionKey)}/suspend`,
      { method: "POST" }
    )
  },
  activateJobDefinition(jobDefinitionKey: string) {
    return request<{ status: string }>(
      `/api/workflow/operate/job-definitions/${encodeURIComponent(jobDefinitionKey)}/activate`,
      { method: "POST" }
    )
  },
}
