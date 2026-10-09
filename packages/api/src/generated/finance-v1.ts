/**
 * Generated from arda-be/contracts/openapi/finance-v1.json.
 * Do not edit by hand; regenerate when the approved OpenAPI operation changes.
 */
export interface FinanceRequestRenumber {
  document_id: string
  display_no: string
  reason: string
}

export interface FinanceApproveRenumber {
  request_id: string
}

export interface FinanceRenumberRequest {
  id: string
  document_id: string
  previous_display_no: string
  requested_display_no: string
  reason: string
  status: "PENDING" | "APPROVED" | "REJECTED"
}

export interface FinanceRenumberRequestSuccess {
  data: FinanceRenumberRequest
  meta: { request_id?: string }
}
