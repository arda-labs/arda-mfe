import { getCanonical, getCanonicalList, postCanonical } from "@workspace/api"
import { buildSearchParams } from "@workspace/api/query"

// Wire types generated from arda-be/contracts/openapi/loan-v1.json (ADR-005).
import type { LoanCollection } from "@workspace/api/generated/loan-v1"
export type { LoanCollection }

export const collectionApi = {
  detail: (id: string) =>
    getCanonical<LoanCollection>(
      `/api/loan/collections/${encodeURIComponent(id)}`
    ),
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
