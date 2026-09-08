/**
 * Static step-code to i18n-key map. Translations live under
 * workflow.workbench.step_* in the app locales; pass t to translate.
 */
const stepKeys: Record<string, string> = {
  submitted: "workflow.workbench.step_submitted",
  Activity_CheckerReview: "workflow.workbench.step_activity_checker_review",
  Activity_MakerRevise: "workflow.workbench.step_activity_maker_revise",
  Activity_RiskReview: "workflow.workbench.step_activity_risk_review",
  Activity_ApproveCustomer: "workflow.workbench.step_activity_approve_customer",
  "classify-account": "workflow.workbench.step_classify_account",
  "approve-journal": "workflow.workbench.step_approve_journal",
  "verify-beneficiary": "workflow.workbench.step_verify_beneficiary",
  "workflow.finance_incoming_classify":
    "workflow.workbench.step_finance_incoming_classify",
  "workflow.finance_incoming_approve":
    "workflow.workbench.step_finance_incoming_approve",
  "workflow.finance_outgoing_verify":
    "workflow.workbench.step_finance_outgoing_verify",
  "workflow.finance_outgoing_approve":
    "workflow.workbench.step_finance_outgoing_approve",
  "workflow.customer_checker_review":
    "workflow.workbench.step_customer_checker_review",
  "workflow.customer_maker_revise":
    "workflow.workbench.step_customer_maker_revise",
  "workflow.hrm_registration_review":
    "workflow.workbench.step_hrm_registration_review",
  "workflow.hrm_registration_approve":
    "workflow.workbench.step_hrm_registration_approve",
}

export function stepLabel(value: string, t?: TFn) {
  const key = stepKeys[value]
  return key && t ? t(key) : value
}

export function formatDateTime(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

export function completionTime(item: {
  completedAt?: string
  status?: string
  transactionStatus?: string
  updatedAt: string
}) {
  if (item.completedAt) return formatDateTime(item.completedAt)
  if (item.status === "COMPLETED" || item.transactionStatus === "COMPLETED") {
    return formatDateTime(item.updatedAt)
  }
  return "-"
}

export function previousAssignee(item: {
  previousAssignedTo?: string
  previousAssignedToName?: string
  variables?: Record<string, unknown>
}): string | undefined {
  if (item.previousAssignedToName) return item.previousAssignedToName
  if (item.previousAssignedTo) return item.previousAssignedTo
  const variables = item.variables ?? {}
  const value = variables.previousAssignee ?? variables.previousAssignedTo
  return typeof value === "string" && value ? value : undefined
}

export function stepLabelOrDefault(value: string, t?: TFn) {
  return stepLabel(value, t)
}

type TFn = (key: string, params?: Record<string, string | number>) => string
