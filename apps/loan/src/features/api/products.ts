import { getCanonicalList, postCanonical } from "@workspace/api"
import { listQuery } from "./list-query"

export interface LoanProduct {
  id: string
  tenant_id: string
  code: string
  name: string
  product_type: "TERM" | "LIMIT"
  currency_code: string
  interest_rate_code?: string
  interest_rate?: number
  loan_term_from?: number
  loan_term_to?: number
  term_unit: string
  min_amount_minor?: number
  max_amount_minor?: number
  acc_classification?: string
  is_active: boolean
  description?: string
  created_at?: string
}

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
