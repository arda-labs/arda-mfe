import type { WorkbenchDirection, WorkflowTaskRequest } from "./types"

export const taskTypesByDirection: Record<
  WorkbenchDirection,
  WorkflowTaskRequest[]
> = {
  incoming: [
    {
      taskType: "workflow.customer_checker_review",
      role: "CUSTOMER_CHECKER",
    },
    {
      taskType: "workflow.customer_risk_review",
      role: "CUSTOMER_RISK_CHECKER",
    },
    {
      taskType: "workflow.customer_maker_revise",
      role: "CUSTOMER_MAKER",
    },
    {
      taskType: "workflow.finance_incoming_classify",
      role: "FINANCE_TXN_MAKER",
    },
    {
      taskType: "workflow.finance_incoming_approve",
      role: "FINANCE_TXN_CHECKER",
    },
    {
      taskType: "workflow.hrm_registration_review",
      role: "HRM_REGISTRATION_REVIEWER",
    },
    {
      taskType: "workflow.hrm_registration_approve",
      role: "HRM_REGISTRATION_APPROVER",
    },
  ],
  outgoing: [
    {
      taskType: "workflow.finance_outgoing_verify",
      role: "FINANCE_TXN_MAKER",
    },
    {
      taskType: "workflow.finance_outgoing_approve",
      role: "FINANCE_TXN_CHECKER",
    },
  ],
}
