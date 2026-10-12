import { getCanonicalList, postCanonical, putCanonical } from "@workspace/api"
import { listQuery } from "./list-query"

// Wire types generated from arda-be/contracts/openapi/loan-v1.json (ADR-005).
import type { LoanVfuMandate, LoanVfuParty, LoanVfuPlan } from "@workspace/api/generated/loan-v1"
export type VfuParty = LoanVfuParty
export type VfuMandate = LoanVfuMandate
export type VfuPlan = LoanVfuPlan

export const vfuApi = {
  listParties: (
    params: {
      q?: string
      page?: number
      per_page?: number
      sort?: string
      order?: "asc" | "desc"
    } = {}
  ) =>
    getCanonicalList<VfuParty>(
      `/api/loan/vfu/parties?${listQuery(params).toString()}`
    ),
  createParty: (body: Partial<VfuParty>) =>
    postCanonical<VfuParty>("/api/loan/vfu/parties", body),
  updateParty: (id: string, body: Partial<VfuParty>) =>
    putCanonical<VfuParty>(
      `/api/loan/vfu/parties/${encodeURIComponent(id)}`,
      body
    ),
  listMandates: (
    params: {
      q?: string
      page?: number
      per_page?: number
      sort?: string
      order?: "asc" | "desc"
    } = {}
  ) =>
    getCanonicalList<VfuMandate>(
      `/api/loan/vfu/mandates?${listQuery(params).toString()}`
    ),
  createMandate: (body: Partial<VfuMandate>) =>
    postCanonical<VfuMandate>("/api/loan/vfu/mandates", body),
  updateMandate: (id: string, body: Partial<VfuMandate>) =>
    putCanonical<VfuMandate>(
      `/api/loan/vfu/mandates/${encodeURIComponent(id)}`,
      body
    ),
  listPlans: (
    params: {
      mandate_code?: string
      page?: number
      per_page?: number
      sort?: string
      order?: "asc" | "desc"
    } = {}
  ) =>
    getCanonicalList<VfuPlan>(
      `/api/loan/vfu/plans?${listQuery(params).toString()}`
    ),
  createPlan: (body: Partial<VfuPlan>) =>
    postCanonical<VfuPlan>("/api/loan/vfu/plans", body),
  updatePlan: (id: string, body: Partial<VfuPlan>) =>
    putCanonical<VfuPlan>(`/api/loan/vfu/plans/${encodeURIComponent(id)}`, body),
}
