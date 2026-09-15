import { api, type ApiSuccess } from "@workspace/api"

export interface ReviewWorkItem {
  id: string
  caseId: string
  caseCode: string
  caseType: string
  title: string
  status: string
  stepCode: string
  stepName?: string
  jobKey?: string
  processInstanceKey?: string
  canClaim?: boolean
  canOpen?: boolean
  assignedTo?: string
  candidateRole?: string
  createdBy?: string
}

export interface ReviewCaseVariables {
  case_id: string
  process_instance_key: string
  variables: Record<string, unknown>
}

/** Posting review (maker confirm / checker approve before posting). */
export const workflowTaskApi = {
  getWorkItem: (id: string) =>
    api
      .get<ApiSuccess<ReviewWorkItem>>(
        `/api/workflow/work-items/${encodeURIComponent(id)}`
      )
      .then((res) => res.result),
  claimWorkItem: (id: string) =>
    api
      .post<ApiSuccess<{ workItem: ReviewWorkItem }>>(
        `/api/workflow/work-items/${encodeURIComponent(id)}/claim`,
        {}
      )
      .then((res) => res.result),
  getCaseVariables: (caseId: string) =>
    api
      .get<ApiSuccess<ReviewCaseVariables>>(
        `/api/workflow/cases/${encodeURIComponent(caseId)}/variables`
      )
      .then((res) => res.result),
  completeTask: (input: {
    jobKey: string
    processInstanceKey: string
    elementId: string
    variables: Record<string, unknown>
  }) =>
    api
      .post<ApiSuccess<{ status: string }>>(
        `/api/workflow/tasks/${encodeURIComponent(input.jobKey)}/complete`,
        {
          processInstanceKey: input.processInstanceKey,
          elementId: input.elementId,
          variables: input.variables,
        }
      )
      .then((res) => res.result),
}
