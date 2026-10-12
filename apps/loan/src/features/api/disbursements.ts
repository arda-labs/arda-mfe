import { getCanonical, getCanonicalList, postCanonical } from "@workspace/api"
import { buildSearchParams } from "@workspace/api/query"

// Wire types generated from arda-be/contracts/openapi/loan-v1.json (ADR-005).
import type { LoanDisbursement } from "@workspace/api/generated/loan-v1"
export type { LoanDisbursement }

/**
 * P1b v2 flow split: REGISTER = khởi tạo giải ngân (phiếu gốc),
 * COMPLETE = hoàn tất giải ngân (rút theo phiếu REGISTER đã POSTED).
 */
export type LoanDisbursementFlowType = "REGISTER" | "COMPLETE"

export const disbursementApi = {
  detail: (id: string) =>
    getCanonical<LoanDisbursement>(
      `/api/loan/disbursements/${encodeURIComponent(id)}`
    ),
  list: (
    params: {
      status?: string
      contract_code?: string
      flow_type?: LoanDisbursementFlowType
      q?: string
      page?: number
      per_page?: number
      sort?: string
      order?: "asc" | "desc"
    } = {}
  ) =>
    getCanonicalList<LoanDisbursement>(
      `/api/loan/disbursements?${buildSearchParams(params).toString()}`
    ),
  create: (body: Partial<LoanDisbursement>) =>
    postCanonical<LoanDisbursement>("/api/loan/disbursements", body),
  submit: (id: string) =>
    postCanonical<LoanDisbursement>(
      `/api/loan/disbursements/${encodeURIComponent(id)}/submit`,
      {}
    ),
}
