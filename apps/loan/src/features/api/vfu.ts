import { getCanonicalList, postCanonical, putCanonical } from "@workspace/api"
import { listQuery } from "./list-query"

export interface VfuParty {
  id: string
  tenant_id: string
  party_code: string
  party_name: string
  party_type: "ORG" | "PERSON"
  identification_id?: string
  mobile_number?: string
  status: string
  created_at?: string
}

export interface VfuMandate {
  id: string
  tenant_id: string
  mandate_code: string
  mandate_no?: string
  mandate_date?: string
  party_code: string
  rep_name?: string
  bank_name?: string
  bank_account?: string
  fee_payment_freq?: string
  rate_value?: number
  status: string
  created_at?: string
}

export interface VfuPlan {
  id: string
  tenant_id: string
  plan_code: string
  plan_date?: string
  mandate_code: string
  contract_code?: string
  allocated_amt_minor: number
  settled_amt_minor: number
  fee_amt_minor: number
  status: string
  created_at?: string
}

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
