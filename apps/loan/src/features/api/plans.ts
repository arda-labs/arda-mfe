import {
  deleteCanonical,
  getCanonicalList,
  postCanonical,
} from "@workspace/api"
import { listQuery } from "./list-query"

/** Loan plan catalog (W7). */
export interface LoanPlan {
  id: string
  code: string
  name: string
  from_date?: string
  to_date?: string
  target_amount_minor: number
  note?: string
  status: string
  org_code?: string
}

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
