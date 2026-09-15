import { getCanonicalList } from "@workspace/api"
import { listQuery } from "./list-query"

/** Loan report rows (W4c). */
export interface LoanLedgerRow {
  txn_date: string
  contract_code: string
  txn_type: string
  amount_minor: number
  principal_minor: number
  interest_minor: number
  currency_code: string
  status: string
}

export interface LoanStatementRow {
  contract_code: string
  agreement_code: string
  disburse_date?: string
  maturity_date?: string
  debt_group_code: string
  disburse_amt_minor: number
  outstanding_amt_minor: number
  coln_principal_amt_minor: number
  coln_interest_amt_minor: number
  interest_rate: number
  status: string
}

export interface CollateralStatementRow {
  coll_code: string
  coll_name: string
  coll_type_code?: string
  mortgage_code?: string
  owner_cif_code?: string
  owner_name?: string
  coll_value_minor: number
  coll_use_value_minor: number
  valuation_date?: string
  status: string
}

export interface LoanDiaryRow {
  txn_date: string
  contract_code: string
  txn_type: string
  amount_minor: number
  currency_code: string
  status: string
}

export interface LoanAppraisalRow {
  contract_code: string
  agreement_code: string
  disburse_date?: string
  maturity_date?: string
  debt_group_code: string
  disburse_amt_minor: number
  outstanding_amt_minor: number
  collateral_minor: number
  coverage_ratio: number
  interest_rate: number
  loan_term: number
  term_unit?: string
  status: string
}

export interface LoanReconciliationRow {
  contract_code: string
  agreement_code: string
  outstanding_amt_minor: number
  planned_principal_minor: number
  planned_interest_minor: number
  variance_minor: number
}

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
