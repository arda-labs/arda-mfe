import { getCanonicalList, postCanonical } from "@workspace/api"
import { buildSearchParams } from "@workspace/api/query"

/**
 * P1b v2 flow split: REGISTER = khởi tạo giải ngân (phiếu gốc),
 * COMPLETE = hoàn tất giải ngân (rút theo phiếu REGISTER đã POSTED).
 */
export type LoanDisbursementFlowType = "REGISTER" | "COMPLETE"

export interface LoanDisbursement {
  id: string
  tenant_id: string
  contract_code: string
  agreement_code: string
  disburse_date: string
  disburse_amt_minor: number
  currency_code: string
  fund_source_code: string
  status: string
  workflow_case_id?: string
  workflow_case_code?: string
  journal_entry_id?: string
  created_by: string
  created_at?: string
  flow_type?: LoanDisbursementFlowType
  /** Chỉ có trên row COMPLETE: id phiếu REGISTER gốc (POSTED, cùng agreement). */
  source_register_id?: string
}

export const disbursementApi = {
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
