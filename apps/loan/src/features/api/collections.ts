import { getCanonicalList, postCanonical } from "@workspace/api"
import { buildSearchParams } from "@workspace/api/query"

export interface LoanCollection {
  id: string
  tenant_id: string
  contract_code: string
  agreement_code: string
  collection_date: string
  principal_minor: number
  interest_minor: number
  currency_code: string
  status: string
  workflow_case_id?: string
  workflow_case_code?: string
  journal_entry_id?: string
  created_by: string
  created_at?: string
}

export const collectionApi = {
  list: (
    params: {
      status?: string
      contract_code?: string
      q?: string
      page?: number
      per_page?: number
      sort?: string
      order?: "asc" | "desc"
    } = {}
  ) =>
    getCanonicalList<LoanCollection>(
      `/api/loan/collections?${buildSearchParams(params).toString()}`
    ),
  create: (body: Partial<LoanCollection>) =>
    postCanonical<LoanCollection>("/api/loan/collections", body),
  submit: (id: string) =>
    postCanonical<LoanCollection>(
      `/api/loan/collections/${encodeURIComponent(id)}/submit`,
      {}
    ),
}
