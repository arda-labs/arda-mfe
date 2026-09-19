import { api, type ApiSuccess } from "@workspace/api"
import {
  claimWorkItem as claimWorkflowItem,
  completeTask as completeWorkflowTask,
  getWorkItem as fetchWorkItem,
} from "@workspace/workflow-task"

export interface ReviewWorkItem {
  id: string
  caseId: string
  caseCode: string
  caseType: string
  title: string
  status: string
  stepCode: string
  stepName?: string
  jobKey?: string | number
  processInstanceKey?: string | number
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
  getWorkItem: (id: string) => fetchWorkItem(id),
  claimWorkItem: (id: string) => claimWorkflowItem(id),
  getCaseVariables: (caseId: string) =>
    api
      .get<ApiSuccess<ReviewCaseVariables>>(
        `/api/workflow/cases/${encodeURIComponent(caseId)}/variables`
      )
      .then((res) => res.result),
  completeTask: (input: {
    jobKey: string | number
    processInstanceKey: string | number
    elementId: string
    variables: Record<string, unknown>
  }) => completeWorkflowTask(input),
}
