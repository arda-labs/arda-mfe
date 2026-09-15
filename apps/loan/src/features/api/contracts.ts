import { getCanonicalList, postCanonical } from "@workspace/api"
import { listQuery } from "./list-query"

/**
 * Credit contract header — mirrors loan-service `domain.Contract`
 * (internal/domain/loan.go). The BE list/get/submit responses all carry the
 * full row, including `workflow_case_id` once the formation case exists
 * (SubmitContract sets it together with status PENDING). `workflow_case_code`
 * is the friendly human-readable case code (e.g. LOAN-20260909-000123).
 */
export interface LoanContract {
  id: string
  tenant_id: string
  contract_code: string
  contract_no?: string
  customer_code: string
  product_code?: string
  contract_type_code?: string
  /** Đơn vị quản lý (BE employee_code — used as org_unit_code in postings). */
  employee_code?: string
  /** Annual rate, percent number (e.g. 8.5). */
  interest_rate?: number
  interest_rate_type?: string
  /** YYYY-MM-DD. */
  contract_date?: string
  loan_amt_minor: number
  loan_term?: number
  term_unit?: string
  /** YYYY-MM-DD. */
  maturity_date?: string
  status: string
  workflow_case_id?: string
  workflow_case_code?: string
  created_by?: string
  created_at?: string
  updated_at?: string
}

export const contractsApi = {
  listContracts: (
    params: {
      q?: string
      status?: string
      page?: number
      per_page?: number
      sort?: string
      order?: "asc" | "desc"
    } = {}
  ) =>
    getCanonicalList<LoanContract>(
      `/api/loan/contracts?${listQuery(params).toString()}`
    ),
  submitContract: (id: string) =>
    postCanonical<LoanContract>(
      `/api/loan/contracts/${encodeURIComponent(id)}/submit`,
      {}
    ),
  createContract: (body: Partial<LoanContract>) =>
    postCanonical<LoanContract>("/api/loan/contracts", body),
}
