import { getCanonicalList } from "@workspace/api"
import { listQuery } from "./list-query"

// Wire types generated from arda-be/contracts/openapi/loan-v1.json (ADR-005).
import type { LoanCollateralStatementRow, LoanLoanAppraisalRow, LoanLoanDiaryRow, LoanLoanLedgerRow, LoanLoanReconciliationRow, LoanLoanStatementRow } from "@workspace/api/generated/loan-v1"
export type LoanLedgerRow = LoanLoanLedgerRow
export type LoanStatementRow = LoanLoanStatementRow
export type CollateralStatementRow = LoanCollateralStatementRow
export type LoanDiaryRow = LoanLoanDiaryRow
export type LoanAppraisalRow = LoanLoanAppraisalRow
export type LoanReconciliationRow = LoanLoanReconciliationRow

/** Loan reports (data owner computes; FE renders + CSV export). */
export const loanReportApi = {
  loanLedger: (
    params: { from?: string; to?: string; contract_code?: string } = {}
  ) =>
    getCanonicalList<LoanLedgerRow>(
      `/api/loan/reports/loan-ledger?${listQuery(params).toString()}`
    ),
  loanStatement: (params: { contract_code?: string } = {}) =>
    getCanonicalList<LoanStatementRow>(
      `/api/loan/reports/loan-statement?${listQuery(params).toString()}`
    ),
  collateralStatement: (params: { status?: string } = {}) =>
    getCanonicalList<CollateralStatementRow>(
      `/api/loan/reports/collateral-statement?${listQuery(params).toString()}`
    ),
  loanDiary: (
    params: { from?: string; to?: string; contract_code?: string } = {}
  ) =>
    getCanonicalList<LoanDiaryRow>(
      `/api/loan/reports/loan-diary?${listQuery(params).toString()}`
    ),
  loanAppraisal: (params: { contract_code?: string } = {}) =>
    getCanonicalList<LoanAppraisalRow>(
      `/api/loan/reports/loan-appraisal?${listQuery(params).toString()}`
    ),
  loanReconciliation: (params: { contract_code?: string } = {}) =>
    getCanonicalList<LoanReconciliationRow>(
      `/api/loan/reports/loan-reconciliation?${listQuery(params).toString()}`
    ),
}
