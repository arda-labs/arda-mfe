import { getCanonicalList, postCanonical } from "@workspace/api"
import { listQuery } from "./list-query"

// Wire types generated from arda-be/contracts/openapi/loan-v1.json (ADR-005).
import type { LoanContract } from "@workspace/api/generated/loan-v1"
export type { LoanContract }

export const contractsApi = {
  listContracts: (
    params: {
      q?: string
      status?: string
      page?: number
      per_page?: number
      sort?: string
      order?: "asc" | "desc"
    } = {}
  ) =>
    getCanonicalList<LoanContract>(
      `/api/loan/contracts?${listQuery(params).toString()}`
    ),
  submitContract: (id: string) =>
    postCanonical<LoanContract>(
      `/api/loan/contracts/${encodeURIComponent(id)}/submit`,
      {}
    ),
  createContract: (body: Partial<LoanContract>) =>
    postCanonical<LoanContract>("/api/loan/contracts", body),
}
