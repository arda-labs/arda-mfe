import { getCanonical, postCanonical, putCanonical } from "@workspace/api"
import type { LoanContract } from "./contracts"
import type { LoanDossier } from "./dossier"

/** Candidate roles của lnm-loan-formation-v2 (zeebe candidateGroups). */
export type LoanFormationRole =
  "LNM_MAKER" | "LNM_TWTD" | "LNM_POGD" | "LNM_GIDO" | "LNM_HODO"

/** User-task elementId của lnm-loan-formation-v2 (BPMN bpmn:userTask id). */
export type LoanFormationStepCode =
  | "UT_MakerInput"
  | "UT_TWRevalidate"
  | "UT_PGDReview"
  | "UT_GDReview"
  | "UT_BoardReview"

/**
 * Work item — mirrors workflow-service `repository.WorkItem` (fields the
 * formation screen consumes). `canClaim` is computed by the BE per caller.
 */
export interface FormationWorkItem {
  id: string
  caseId: string
  caseCode?: string
  caseType?: string
  title?: string
  status?: string
  stepCode?: string
  taskType?: string
  primaryObjectId?: string
  processInstanceKey?: string | number
  jobKey?: string | number
  candidateRole?: string
  assignedTo?: string
  assignedToName?: string
  canClaim?: boolean
}

/** Claim response — mirrors the CRM `WorkflowTask` shape (claim WorkflowTask). */
export interface FormationClaimedTask {
  jobKey: string | number
  type?: string
  elementId?: string
  processInstanceKey?: string | number
  caseId?: string
  candidateRole?: string
}

/** Body của PUT /api/loan/contracts/{id} — whitelist BE UpdateContract. */
export interface LoanContractUpdateInput {
  contract_no?: string
  loan_amt_minor: number
  interest_rate: number
  loan_term: number
  term_unit?: string
  contract_date?: string
  maturity_date?: string
  interest_schedule_day?: number
  interest_payment_freq?: string
  principal_payment_freq?: string
  purpose_code?: string
  employee_code?: string
  industry_code?: string
  loan_method_code?: string
}

/** Response của GET /api/workflow/cases/{id}/variables (caseVariables handler). */
export interface FormationCaseVariables {
  case_id: string
  process_instance_key: string
  variables: Record<string, unknown>
}

export const formationApi = {
  getWorkItem: (id: string) =>
    getCanonical<FormationWorkItem>(
      `/api/workflow/work-items/${encodeURIComponent(id)}`
    ),
  claimWorkItem: (id: string) =>
    postCanonical<{ workItem: FormationWorkItem }>(
      `/api/workflow/work-items/${encodeURIComponent(id)}/claim`,
      {}
    ),
  getCaseVariables: (caseId: string) =>
    getCanonical<FormationCaseVariables>(
      `/api/workflow/cases/${encodeURIComponent(caseId)}/variables`
    ),
  claimTask: (input: {
    role: string
    taskType?: string
    processInstanceKey?: string | number
    caseId?: string | null
    elementId?: string | null
  }) => postCanonical<FormationClaimedTask>("/api/workflow/tasks/claim", input),
  getTaskReadiness: (caseId: string, stepCode: string) =>
    getCanonical<{ ready: boolean; status: string }>(
      `/api/workflow/cases/${encodeURIComponent(caseId)}/task-readiness?stepCode=${encodeURIComponent(stepCode)}`
    ),
  completeTask: (input: {
    jobKey: string
    processInstanceKey: string
    elementId: string
    variables: Record<string, unknown>
  }) =>
    postCanonical<{ status: string }>(
      `/api/workflow/tasks/${encodeURIComponent(input.jobKey)}/complete`,
      {
        processInstanceKey: input.processInstanceKey,
        elementId: input.elementId,
        variables: input.variables,
      }
    ),
  getDossier: (contractId: string) =>
    getCanonical<LoanDossier>(
      `/api/loan/contracts/${encodeURIComponent(contractId)}/dossier`
    ),
  updateContract: (id: string, body: LoanContractUpdateInput) =>
    putCanonical<LoanContract>(
      `/api/loan/contracts/${encodeURIComponent(id)}`,
      body
    ),
}
