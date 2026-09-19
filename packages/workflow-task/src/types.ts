/**
 * Shared wire types for the workflow task runtime. Shapes mirror the
 * workflow-service work-item / task responses (camelCase envelope); step
 * metadata (`stepKind`, `allowedActions`, `requiredCommentOn`, `formKey`,
 * `registryVersion`) comes from the server registry v2.
 */

export type WorkflowTaskAction =
  | "SUBMIT"
  | "APPROVE"
  | "REQUEST_CHANGES"
  | "REJECT"
  | (string & {})

export interface WorkflowTaskStepMetadata {
  stepKind?: "INPUT" | "REVISE" | "CHECKER" | "REVIEW" | "OPERATE" | (string & {})
  formKey?: string
  allowedActions?: WorkflowTaskAction[]
  requiredCommentOn?: WorkflowTaskAction[]
  registryVersion?: number
}

export interface WorkItem extends WorkflowTaskStepMetadata {
  id: string
  caseId: string
  caseCode: string
  caseType: string
  title: string
  description?: string
  summary?: string
  stepCode: string
  status: string
  transactionStatus?: string
  direction?: string
  candidateRole?: string
  candidateUsers?: string[]
  assignedTo?: string
  assignedToName?: string
  previousAssignedTo?: string
  jobKey?: string | number
  processInstanceKey?: string | number
  claimExpiresAt?: string
  slaDueAt?: string
  slaStatus?: string
  canClaim?: boolean
  canOpen?: boolean
  canReassign?: boolean
  claimBlockedReason?: string
  primaryObjectType?: string
  primaryObjectId?: string
  createdBy?: string
  createdByName?: string
  createdAt?: string
  updatedAt: string
}

export interface WorkflowTask {
  jobKey: string | number
  type?: string
  elementId?: string
  processInstanceKey: string | number
  caseId?: string
  candidateRole?: string
  variables?: Record<string, unknown>
}

export interface CompleteTaskInput {
  jobKey: string | number
  processInstanceKey: string | number
  elementId: string
  variables: Record<string, unknown>
}

export interface ClaimTaskInput {
  role?: string
  taskType?: string
  processInstanceKey?: string | number
  caseId?: string | null
  elementId?: string | null
}

export interface ClaimWorkItemResponse {
  workItem: WorkItem
  claimedBy?: string
  claimedAt?: string
}

export interface TaskReadiness {
  ready: boolean
  status: string
}

export interface WorkflowCaseRef {
  id?: string
  caseCode?: string
  status?: string
  currentStep?: string
  processInstanceKey?: string | number
}

// ── Form host contract (P1.6) ────────────────────────────────────────────────
// Each domain remote exposes `./taskForms` — a static registry keyed by the
// server-provided `formKey` (`<caseType>.<stepCode>`, lowercased). The workbench
// resolves the form from work-item metadata; there is no case-type fallback.

export type TaskFormMode = "act" | "view"

export interface TaskFormSubmit {
  action: WorkflowTaskAction
  comment?: string
  /** Extra variables merged into the complete-task call (e.g. dataVersion). */
  variables?: Record<string, unknown>
}

export interface TaskFormProps {
  task: WorkItem
  mode: TaskFormMode
  /** Case variables the host already fetched (submission payload / preview). */
  data?: Record<string, unknown>
  submitting?: boolean
  onSubmit: (submission: TaskFormSubmit) => void | Promise<void>
  onReturn: () => void
  /** Present when the step allows REJECT; the form decides whether to render it. */
  onReject?: (comment?: string) => void | Promise<void>
}

export type TaskFormComponent = import("react").ComponentType<TaskFormProps>

export type TaskFormRegistry = Record<string, TaskFormComponent>

/** Shape of a remote `./taskForms` module. */
export interface TaskFormModule {
  default?: TaskFormRegistry
  taskForms?: TaskFormRegistry
  /** The remote's locale loader (`createAppLocaleLoader`) so the host can
   * register its bundle before rendering the form. */
  locales?: { preload: (locale?: string) => Promise<void> }
}
