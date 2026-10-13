import type {
  WorkflowBusinessCase,
  WorkflowWorkItem,
  WorkflowWorkItemClaimResult,
  WorkflowWorkItemSummaryNode,
  WorkflowWorkflowTask,
} from "@workspace/api/generated/workflow-v1"

export type WorkbenchDirection = "incoming" | "outgoing"
export type WorkbenchSearchDirection = "ALL" | "INCOMING" | "OUTGOING"

/**
 * Generated workflow wire types (ADR-005): declared once in
 * @workspace/api/generated/workflow-v1, never redeclared here. Only the
 * literal unions the workbench UI switches on are narrowed.
 */
export type WorkflowCase = WorkflowBusinessCase

export type WorkflowTask = WorkflowWorkflowTask

export interface WorkflowCaseSearchParams {
  keyword: string
  direction: WorkbenchSearchDirection
  status: string
}

export interface WorkflowTaskRequest {
  taskType: string
  role: string
}

export type WorkItemStepKind = "INPUT" | "REVISE" | "CHECKER" | "REVIEW" | "OPERATE"
export type WorkItemSlaStatus = "NONE" | "MET" | "WARNING" | "BREACHED"

export type WorkItem = Omit<WorkflowWorkItem, "stepKind" | "slaStatus"> & {
  stepKind: WorkItemStepKind
  slaStatus: WorkItemSlaStatus
}

export interface WorkItemFilter {
  keyword?: string
  direction?: WorkbenchSearchDirection
  fromDate?: string
  toDate?: string
  accounting?: "ALL" | "POSTED" | "NOT_POSTED"
  slaStatus?: "ALL" | "MET" | "BREACHED"
  transactionStatus?: string
  node?: string
  domain?: string
  status?: string
  caseType?: string
  candidateRole?: string
  assignedTo?: string
  priority?: string
  dueBefore?: string
  limit?: number
  offset?: number
}

export type WorkItemSummaryNode = WorkflowWorkItemSummaryNode

export interface ClaimWorkItemRequest {
  workItemId: string
  assignee?: string
  role?: string
}

export type ClaimWorkItemResponse = Omit<WorkflowWorkItemClaimResult, "workItem"> & {
  workItem: WorkItem
}
