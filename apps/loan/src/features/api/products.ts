import { getCanonicalList, postCanonical } from "@workspace/api"
import { listQuery } from "./list-query"

// Wire types generated from arda-be/contracts/openapi/loan-v1.json (ADR-005).
import type { LoanLoanProduct } from "@workspace/api/generated/loan-v1"
export type LoanProduct = LoanLoanProduct

export const productApi = {
  listProducts: (
    params: {
      include_inactive?: boolean
      is_active?: string
      q?: string
      page?: number
      per_page?: number
      sort?: string
      order?: "asc" | "desc"
    } = {}
  ) =>
    getCanonicalList<LoanProduct>(
      `/api/loan/products?${listQuery(params).toString()}`
    ),
  upsertProduct: (body: Partial<LoanProduct>) =>
    postCanonical<LoanProduct>("/api/loan/products", body),
}
