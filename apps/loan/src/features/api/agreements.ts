import { getCanonicalList } from "@workspace/api"

// Wire types generated from arda-be/contracts/openapi/loan-v1.json (ADR-005).
import type { LoanAgreement, LoanPostingRuleView } from "@workspace/api/generated/loan-v1"
export type { LoanAgreement }
export type LoanPostingRule = LoanPostingRuleView

export type LoanBatchDocumentType =
  "LNM_DISB_REGISTER" | "LNM_DISB_COMPLETE" | "LNM_COLLECTION"

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
