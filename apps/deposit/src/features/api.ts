import { getCanonical, getCanonicalList, postCanonical } from "@workspace/api"
import type { ApiRequestOptions } from "@workspace/api/client"

// ── Savings products ──

export interface SavingsProduct {
  id: string
  tenant_id: string
  code: string
  name: string
  term_months: number
  interest_rate: number
  currency_code: string
  is_active: boolean
}

// ── Savings account ──

export interface Savings {
  id: string
  tenant_id: string
  savings_code: string
  customer_code: string
  product_code: string
  open_date: string
  maturity_date: string
  principal_minor: number
  accrued_minor: number
  currency_code: string
  org_code?: string
  status: string
  workflow_case_id?: string
  journal_entry_id?: string
  created_by: string
  created_at?: string
}

// ── Interbank deposit ──

export interface InterbankDeposit {
  id: string
  tenant_id: string
  deposit_code: string
  counterparty_code: string
  deposit_date: string
  maturity_date: string
  principal_minor: number
  interest_rate: number
  accrued_minor: number
  currency_code: string
  org_code?: string
  status: string
  created_by: string
  created_at?: string
}

export const depositApi = {
  listProducts: (requestOptions?: ApiRequestOptions) =>
    getCanonicalList<SavingsProduct>("/api/deposit/products", requestOptions),
  listSavings: (params: { status?: string; q?: string } = {}, requestOptions?: ApiRequestOptions) => {
    const search = new URLSearchParams()
    if (params.status) search.set("status", params.status)
    if (params.q) search.set("q", params.q)
    const qs = search.toString()
    return getCanonicalList<Savings>(`/api/deposit/savings${qs ? `?${qs}` : ""}`, requestOptions)
  },
  openSavings: (body: {
    savings_code: string
    customer_code: string
    product_code: string
    open_date: string
    principal_minor: number
    currency_code?: string
  }) => postCanonical<Savings>("/api/deposit/savings/open", body),
  settleSavings: (savingsCode: string) =>
    postCanonical<Savings>(`/api/deposit/savings/${encodeURIComponent(savingsCode)}/settle`, {}),
  listInterbank: (params: { status?: string } = {}, requestOptions?: ApiRequestOptions) => {
    const search = new URLSearchParams()
    if (params.status) search.set("status", params.status)
    const qs = search.toString()
    return getCanonicalList<InterbankDeposit>(`/api/deposit/interbank${qs ? `?${qs}` : ""}`, requestOptions)
  },
}

export interface ProductUpsertInput {
  code: string
  name: string
  term_months: number
  interest_rate: number
  currency_code?: string
}

export const productApi = {
  upsert: (body: ProductUpsertInput) =>
    postCanonical<SavingsProduct>("/api/deposit/products", body),
}

export { getCanonical }
