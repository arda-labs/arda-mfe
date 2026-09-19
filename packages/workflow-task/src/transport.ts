import { getCanonical, postCanonical } from "@workspace/api"
import type {
  ClaimTaskInput,
  ClaimWorkItemResponse,
  CompleteTaskInput,
  TaskReadiness,
  WorkflowTask,
  WorkItem,
} from "./types"

/**
 * Single transport for the workflow task runtime. The four remotes (crm, loan,
 * finance, workflow) used to carry their own copies of these four endpoints;
 * they now delegate here so claim/complete semantics stay identical.
 */

export function getWorkItem(id: string): Promise<WorkItem> {
  return getCanonical<WorkItem>(
    `/api/workflow/work-items/${encodeURIComponent(id)}`
  )
}

export function claimWorkItem(id: string): Promise<ClaimWorkItemResponse> {
  return postCanonical<ClaimWorkItemResponse>(
    `/api/workflow/work-items/${encodeURIComponent(id)}/claim`,
    {}
  )
}

export function claimTask(input: ClaimTaskInput): Promise<WorkflowTask> {
  return postCanonical<WorkflowTask>("/api/workflow/tasks/claim", input)
}

export function completeTask(input: CompleteTaskInput): Promise<{ status: string }> {
  return postCanonical<{ status: string }>(
    `/api/workflow/tasks/${encodeURIComponent(String(input.jobKey))}/complete`,
    {
      processInstanceKey: input.processInstanceKey,
      elementId: input.elementId,
      variables: input.variables,
    }
  )
}

export function getTaskReadiness(
  caseId: string,
  stepCode: string
): Promise<TaskReadiness> {
  return getCanonical<TaskReadiness>(
    `/api/workflow/cases/${encodeURIComponent(caseId)}/task-readiness?stepCode=${encodeURIComponent(stepCode)}`
  )
}
