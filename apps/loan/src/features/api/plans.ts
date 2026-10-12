import {
  deleteCanonical,
  getCanonicalList,
  postCanonical,
} from "@workspace/api"
import { listQuery } from "./list-query"

// Wire types generated from arda-be/contracts/openapi/loan-v1.json (ADR-005).
import type { LoanLoanPlan } from "@workspace/api/generated/loan-v1"
export type LoanPlan = LoanLoanPlan

export const loanPlanApi = {
  list: (params: { status?: string } = {}) =>
    getCanonicalList<LoanPlan>(
      `/api/loan/plans?${listQuery(params).toString()}`
    ),
  upsert: (body: Partial<LoanPlan>) =>
    postCanonical<LoanPlan>("/api/loan/plans", body),
  close: (id: string) =>
    deleteCanonical<{ ok: boolean }>(
      `/api/loan/plans/${encodeURIComponent(id)}`
    ),
}
