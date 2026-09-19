export type WorkbenchDirection = "incoming" | "outgoing"
export type WorkbenchSearchDirection = "ALL" | "INCOMING" | "OUTGOING"

export interface WorkflowCase {
  id: string
  tenantId: string
  caseType: string
  caseCode: string
  title: string
  primaryObjectType: string
  primaryObjectId: string
  domainService: string
  status: string
  currentStep: string
  priority: string
  createdBy: string
  assignedTo?: string
  candidateRole?: string
  slaDueAt?: string
  processInstanceKey?: number
  bpmnProcessId?: string
  bpmnVersion?: number
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface WorkflowTask {
  jobKey?: number
  type: string
  elementId: string
  processInstanceKey?: number
  caseId: string
  caseCode: string
  customerId: string
  customerName: string
  candidateRole: string
  formKey: string
  slaDueAt?: string
  variables: Record<string, unknown>
}

export interface WorkflowCaseSearchParams {
  keyword: string
  direction: WorkbenchSearchDirection
  status: string
}

export interface WorkflowTaskRequest {
  taskType: string
  role: string
}

export interface WorkItem {
  id: string
  tenantId?: string
  caseId: string
  caseCode: string
  caseType: string
  title: string
  description?: string
  summary?: string
  status: string
  transactionStatus?: string
  priority?: string
  direction?: WorkbenchSearchDirection
  currentStep?: string
  stepCode: string
  stepName?: string
  taskType?: string
  formKey?: string
  primaryObjectType?: string
  primaryObjectId?: string
  domainService?: string
  assignedTo?: string
  assignedToName?: string
  assignedToAvatar?: string
  previousAssignedTo?: string
  previousAssignedToName?: string
  previousAssignedToAvatar?: string
  assignedAt?: string
  claimExpiresAt?: string
  candidateRole?: string
  candidateGroupId?: string
  candidateOrgUnitId?: string
  stepKind?: "INPUT" | "REVISE" | "CHECKER" | "REVIEW" | "OPERATE"
  allowedActions?: string[]
  requiredCommentOn?: string[]
  registryVersion?: number
  createdBy?: string
  createdByName?: string
  createdByAvatar?: string
  claimable?: boolean
  canClaim?: boolean
  canOpen?: boolean
  canReassign?: boolean
  claimBlockedReason?: string
  jobKey?: string
  processInstanceKey?: string
  bpmnProcessId?: string
  bpmnVersion?: number
  slaDueAt?: string
  slaStatus?: "NONE" | "MET" | "WARNING" | "BREACHED"
  createdAt?: string
  updatedAt: string
  completedAt?: string
  variables?: Record<string, unknown>
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

export interface WorkItemSummaryNode {
  id: string
  label: string
  count: number
  overdue?: number
  status?: string
  caseType?: string
  direction?: WorkbenchSearchDirection
  children?: WorkItemSummaryNode[]
}

export interface ClaimWorkItemRequest {
  workItemId: string
  assignee?: string
  role?: string
}

export interface ClaimWorkItemResponse {
  workItem: WorkItem
  claimedBy?: string
  claimedAt?: string
}
