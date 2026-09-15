import { listParamsToQuery, request, requestList } from "./internal"
import type { WorkflowListParams } from "./types"

export interface WorkflowCaseType {
  caseType: string
  businessArea: string
  operationName: string
  bpmnProcessId: string
  bpmnVersion: number
  workflowEnabled: boolean
  defaultSlaPolicyId?: string
  makerRole: string
  checkerRole: string
  ownerService: string
  status: string
  effectiveFrom: string
  effectiveTo?: string
}

export interface WorkflowCase {
  id: string
  caseType: string
  caseCode: string
  title: string
  primaryObjectType?: string
  primaryObjectId?: string
  domainService?: string
  status: string
  currentStep: string
  assignedTo?: string
  candidateRole?: string
  slaDueAt?: string
  processInstanceKey?: number
  bpmnProcessId?: string
  bpmnVersion?: number
  updatedAt: string
}

export interface ProcessInstancePendingJob {
  jobKey: string
  jobType: string
  elementId: string
  processInstanceKey: string
  caseId?: string
  retries: number
  state: string
  errorMessage?: string
}

export interface ProcessInstanceIncident {
  jobKey: string
  jobType: string
  elementId: string
  retries: number
  errorMessage: string
  createdAt: string
}

export interface ProcessInstanceRuntime {
  processInstanceKey: string
  zeebeStatus: "ok" | "unreachable" | string
  activeElementId?: string
  case?: WorkflowCase | null
  activeWorkTask?: {
    id: string
    taskType?: string
    stepCode: string
    jobKey?: string
    status: string
    candidateRole?: string
  } | null
  pendingJobs: ProcessInstancePendingJob[]
  incidents: ProcessInstanceIncident[]
  pendingJobsError?: string
  timeline?: Array<{
    id: number
    eventType: string
    note?: string
    createdAt: string
  }>
  hint: string
  workerNote: string
}

export interface WorkflowTimelineEvent {
  id: number
  caseId: string
  eventType: string
  fromStatus?: string
  toStatus?: string
  actor?: string
  note: string
  data?: unknown
  createdAt: string
}

export const casesApi = {
  async listCaseTypes(params?: WorkflowListParams) {
    return requestList<WorkflowCaseType>(
      `/api/workflow/case-types${listParamsToQuery(params)}`
    )
  },
  async listCases() {
    return request<WorkflowCase[]>("/api/workflow/cases?limit=100")
  },
  getProcessInstanceRuntime(processInstanceKey: string | number) {
    return request<ProcessInstanceRuntime>(
      `/api/workflow/process-instances/${encodeURIComponent(String(processInstanceKey))}/runtime`
    )
  },
  retryWorkflowJob(jobKey: string, retries = 3) {
    return request<{ status: string; jobKey: string; retries: number }>(
      `/api/workflow/jobs/${encodeURIComponent(jobKey)}/retry`,
      { method: "POST", body: { retries } }
    )
  },
  retryProcessServiceJobs(processInstanceKey: string | number) {
    return request<{ status: string; retried: string[]; message?: string }>(
      `/api/workflow/process-instances/${encodeURIComponent(String(processInstanceKey))}/retry-service-jobs`,
      { method: "POST" }
    )
  },
  getCaseTimeline(caseId: string) {
    return request<WorkflowTimelineEvent[]>(
      `/api/workflow/cases/${encodeURIComponent(caseId)}/timeline`
    )
  },
  createCaseType(
    payload: Omit<WorkflowCaseType, "effectiveFrom" | "effectiveTo">
  ) {
    return request<WorkflowCaseType>("/api/workflow/case-types", {
      method: "POST",
      body: payload,
    })
  },
  updateCaseType(
    caseType: string,
    payload: Omit<
      WorkflowCaseType,
      "caseType" | "effectiveFrom" | "effectiveTo"
    >
  ) {
    return request<WorkflowCaseType>(
      `/api/workflow/case-types/${encodeURIComponent(caseType)}`,
      { method: "PUT", body: payload }
    )
  },
}
