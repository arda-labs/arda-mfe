import { getCanonicalList } from "@workspace/api"

/**
 * Disbursement agreement — mirrors loan-service agreement rows. `plan_code`
 * groups contracts into posting plans (batch grids group rows by it);
 * `outstanding_amt_minor` (dư nợ đã giải ngân) + `pending_disburse_amt_minor`
 * (đang chờ duyệt) are the headroom inputs against `loan_amt_minor`.
 */
export interface LoanAgreement {
  agreement_code: string
  contract_code: string
  plan_code?: string
  currency_code: string
  outstanding_amt_minor: number
  pending_disburse_amt_minor: number
  disburse_amt_minor?: number
  status: string
}

export type LoanBatchDocumentType =
  "LNM_DISB_REGISTER" | "LNM_DISB_COMPLETE" | "LNM_COLLECTION"

/** One resolved posting-rule line (STT / Nợ-Có / phân giải / tài khoản). */
export interface LoanPostingRule {
  line_no: number
  direction: "DEBIT" | "CREDIT"
  resolution_type: string
  account_ref: string
  acc_classification?: string
}

/**
 * Agreement + posting-rule reference reads shared by the contract pickers and
 * the batch grids (posting preview).
 */
export const agreementsApi = {
  /** Agreements of one contract (plan_code + dư nợ + đang chờ) — contract
   * picker + batch grids đọc headroom từ đây. */
  listAgreements: (contractCode: string) =>
    getCanonicalList<LoanAgreement>(
      `/api/loan/agreements?contract_code=${encodeURIComponent(contractCode)}`
    ),
  /** Quy tắc định khoản khai báo sẵn theo document_type (preview bút toán). */
  postingRules: (documentType: LoanBatchDocumentType) =>
    getCanonicalList<LoanPostingRule>(
      `/api/loan/posting-rules?document_type=${encodeURIComponent(documentType)}`
    ),
}
