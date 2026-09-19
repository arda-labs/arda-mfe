import { getCanonical, getCanonicalList, postCanonical } from "@workspace/api"
import { listQuery } from "./list-query"

/** One period preview/row — mirrors loan-service GeneralProvisionPreview. */
export interface GeneralProvision {
  id?: string
  org_code: string
  provision_date: string
  rate_percent: number
  total_outstanding_minor: number
  accum_provision_minor: number
  required_provision_minor: number
  alloc_minor: number
  reverse_minor: number
  status?: string
  workflow_case_id?: string
  workflow_case_code?: string
  journal_entry_id?: string
  created_by?: string
  created_at?: string
  /** Row version the checker saw — sent back as `dataVersion` on approve. */
  data_version?: number
}

/** LNM.306 specific provision row/preview (per-loan, W7). */
export interface SpecificProvision {
  id?: string
  contract_code: string
  agreement_code: string
  provision_date: string
  debt_group_code: string
  rate_percent: number
  outstanding_minor: number
  deduction_minor: number
  base_minor: number
  amount_minor: number
  status?: string
  workflow_case_id?: string
  workflow_case_code?: string
  journal_entry_id?: string
  created_by?: string
  created_at?: string
  /** Row version the checker saw — sent back as `dataVersion` on approve. */
  data_version?: number
}

/** General provision (LNM.307.01). */
export const generalProvisionApi = {
  detail: (id: string) =>
    getCanonical<GeneralProvision>(
      `/api/loan/general-provisions/${encodeURIComponent(id)}`
    ),
  calculate: (body: { org_code?: string; provision_date: string }) =>
    postCanonical<GeneralProvision>(
      "/api/loan/general-provisions/calculate",
      body
    ),
  submit: (body: { org_code?: string; provision_date: string }) =>
    postCanonical<GeneralProvision>("/api/loan/general-provisions", body),
  list: (params: { org?: string } = {}) =>
    getCanonicalList<GeneralProvision>(
      `/api/loan/general-provisions?${listQuery(params).toString()}`
    ),
}

export const specificProvisionApi = {
  detail: (id: string) =>
    getCanonical<SpecificProvision>(
      `/api/loan/specific-provisions/${encodeURIComponent(id)}`
    ),
  calculate: (body: { agreement_code: string; provision_date: string }) =>
    postCanonical<SpecificProvision>(
      "/api/loan/specific-provisions/calculate",
      body
    ),
  submit: (body: { agreement_code: string; provision_date: string }) =>
    postCanonical<SpecificProvision>("/api/loan/specific-provisions", body),
  list: (params: { status?: string } = {}) =>
    getCanonicalList<SpecificProvision>(
      `/api/loan/specific-provisions?${listQuery(params).toString()}`
    ),
}
