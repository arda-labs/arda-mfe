import type {
  WorkflowBusinessCase,
  WorkflowTimelineEvent,
  WorkflowWorkItem as GeneratedWorkItem,
  WorkflowWorkflowTask,
} from "@workspace/api/generated/workflow-v1"
import type { CrmCustomer } from "@workspace/api/reference/crm"

export type CustomerType = "PERSONAL" | "BUSINESS"
export type CustomerStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "NEEDS_CHANGES"
  | "REJECTED"
  | "APPROVED"
  | "ACTIVE"
  | "PENDING_AMENDMENT"
  | "CANCELLED"
  | "CREATED"
  | "UPDATED"

export type AmendmentStatus = "DRAFT" | "PENDING" | "APPLIED" | "REJECTED"

export interface CustomerAmendment {
  id: string
  customerId: string
  workflowCaseId?: string
  status: AmendmentStatus
  beforeSnapshot?: Record<string, unknown>
  afterSnapshot?: Record<string, unknown>
  changedFields?: string[]
  appliedAt?: string
  appliedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  createdAt: string
  updatedAt: string
}

export interface AmendmentUpsertPayload {
  afterSnapshot: Record<string, unknown>
  changedFields: string[]
}

/**
 * CRM reference type (ADR-005): the wire shape lives in
 * @workspace/api/reference/crm; only the literal unions are narrowed here.
 */
export type Customer = Omit<CrmCustomer, "customerType" | "status"> & {
  customerType: CustomerType
  status: CustomerStatus
}

export interface CustomerPayload {
  id?: string
  customerType: CustomerType
  name: string
  email: string
  status: CustomerStatus
  mobile: string
  identityNo: string
  address: string
  segment: string
  rank: string
  riskLevel: string
  generalInfo: Record<string, unknown>
  personalInfo: Record<string, unknown>
  businessInfo: Record<string, unknown>
  extendedInfo: Record<string, unknown>
}

export interface CustomerRelationship {
  id: string
  customerId: string
  relatedCustomerId: string
  relatedCustomerCode?: string
  relatedCustomerName: string
  relatedCustomerAddress: string
  relationType: string
  relationCode: string
  reciprocalRelationCode: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface CustomerRelationshipPayload {
  relatedCustomerId: string
  relationType: string
  relationCode: string
  reciprocalRelationCode: string
  status: string
}

export type CustomerListParams = {
  customerType?: CustomerType
  status?: CustomerStatus
  riskOnly?: boolean
  q?: string
  page?: number
  perPage?: number
}

export type WorkflowTaskRole =
  "CUSTOMER_CHECKER" | "CUSTOMER_RISK_CHECKER" | "CUSTOMER_MAKER"

/** Generated workflow wire types (ADR-005); see workflow-v1.json. */
export type WorkflowTask = WorkflowWorkflowTask

export type WorkflowWorkItem = GeneratedWorkItem

export type WorkflowCase = WorkflowBusinessCase

export type { WorkflowTimelineEvent }
