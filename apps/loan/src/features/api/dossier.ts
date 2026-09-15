import type { LoanContract } from "./contracts"
import type { LoanAgreement } from "./agreements"

/**
 * One repay schedule row — mirrors loan-service `domain.RepayPlan` json tags
 * (internal/domain/loan.go:104-122). `to_date` is the payment due date; the
 * outstanding-after-period column is computed FE-side (previous balance −
 * plan principal) because BE stores the running `coln_*` paid amounts only.
 */
export interface LoanRepayPlan {
  id: string
  tenant_id: string
  contract_code: string
  agreement_code: string
  plan_no: number
  term_no: number
  from_date: string
  to_date: string
  interest_rate: number
  plan_principal_amt_minor: number
  plan_interest_amt_minor: number
  coln_principal_amt_minor: number
  coln_interest_amt_minor: number
  is_active: boolean
}

/**
 * Composite dossier — mirrors loan-service `repository.Dossier`; only the
 * sections the two FE screens read are typed, the rest stays opaque.
 */
export interface LoanDossier {
  contract: LoanContract
  agreements: LoanAgreement[]
  repay_plans: LoanRepayPlan[]
  disbursements: unknown[]
  collections: unknown[]
  mortgages: unknown[]
  collaterals: unknown[]
  workflow_case_ids: string[]
}
