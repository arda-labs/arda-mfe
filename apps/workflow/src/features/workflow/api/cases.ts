import { listParamsToQuery, request, requestList } from "./internal"
import type { WorkflowListParams } from "./types"
import type {
  WorkflowBusinessCase,
  WorkflowCaseType as WorkflowCaseTypeWire,
  WorkflowProcessIncidentSnapshot,
  WorkflowProcessInstanceRuntime,
  WorkflowProcessJobSnapshot,
  WorkflowTimelineEvent,
} from "@workspace/api/generated/workflow-v1"

/**
 * Generated workflow wire types (ADR-005): declared once in
 * @workspace/api/generated/workflow-v1, never redeclared here.
 */
export type WorkflowCaseType = WorkflowCaseTypeWire

export type WorkflowCase = WorkflowBusinessCase

export type ProcessInstancePendingJob = WorkflowProcessJobSnapshot

export type ProcessInstanceIncident = WorkflowProcessIncidentSnapshot

export type ProcessInstanceRuntime = WorkflowProcessInstanceRuntime

export type { WorkflowTimelineEvent }

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
