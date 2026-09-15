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

export interface Customer {
  id: string
  customerCode: string
  workflowCaseId?: string
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
  createdAt: string
  updatedAt: string
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

export interface WorkflowTask {
  jobKey: string
  type: string
  elementId: string
  processInstanceKey: string
  caseId: string
  caseCode: string
  customerId: string
  customerName: string
  candidateRole: string
  formKey: string
  variables: Record<string, unknown>
}

export interface WorkflowWorkItem {
  id: string
  caseId: string
  caseCode: string
  primaryObjectId?: string
  processInstanceKey?: string | number
  jobKey?: string | number
  stepCode?: string
  candidateRole?: string
}

export interface WorkflowCase {
  id: string
  caseCode: string
  caseType: string
  primaryObjectId?: string
  processInstanceKey?: string | number
  currentStep?: string
  candidateRole?: string
  status: string
}

export interface WorkflowTimelineEvent {
  id: number
  caseId: string
  eventType: string
  note: string
  actor?: string | null
  createdAt: string
}
