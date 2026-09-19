import type {
  SavingsProduct,
  Savings,
  InterbankDeposit,
  IbmProduct,
  IbmMovement,
  IbmDetail,
  InterestRate,
  InterestOp,
  SavingsDetail,
  DepositStatementRow,
  DepositTxnRow,
  InterbankStatementRow,
  InterbankTxnRow,
  DepositSubmission,
  ProductRequest,
  RateRequest,
} from "./types"
import type { ApiRequestOptions } from "@workspace/api/client"
import { buildListSearchParams } from "@workspace/api/list"
import { getCanonical, getCanonicalList, postCanonical } from "@workspace/api"

export const depositApi = {
  listProducts: (
    params: {
      q?: string
      is_active?: string
      sort?: string
      order?: string
    } = {},
    requestOptions?: ApiRequestOptions
  ) => {
    const search = buildListSearchParams({
      q: params.q,
      sort: params.sort,
      order:
        params.order === "asc" || params.order === "desc"
          ? params.order
          : undefined,
      ...(params.is_active ? { is_active: params.is_active } : {}),
    })
    const qs = search.toString()
    return getCanonicalList<SavingsProduct>(
      `/api/deposit/products${qs ? `?${qs}` : ""}`,
      requestOptions
    )
  },
  upsertProduct: (body: {
    code: string
    name: string
    term_months: number
    interest_rate: number
    currency_code?: string
  }) => postCanonical<SavingsProduct>("/api/deposit/products", body),
  submitProductRequest: (
    requestType: "REGISTER" | "EDIT",
    body: {
      product_code: string
      name: string
      term_months: number
      interest_rate: number
      currency_code?: string
    }
  ) =>
    postCanonical<DepositSubmission>("/api/deposit/product-requests", {
      request_type: requestType,
      ...body,
    }),
  listProductRequests: (
    params: { status?: string } = {},
    requestOptions?: ApiRequestOptions
  ) => {
    const search = new URLSearchParams()
    if (params.status) search.set("status", params.status)
    const qs = search.toString()
    return getCanonicalList<ProductRequest>(
      `/api/deposit/product-requests${qs ? `?${qs}` : ""}`,
      requestOptions
    )
  },
  getProductRequest: (id: string) =>
    getCanonical<ProductRequest>(
      `/api/deposit/product-requests/${encodeURIComponent(id)}`
    ),
  listSavings: (
    params: { status?: string; q?: string } = {},
    requestOptions?: ApiRequestOptions
  ) => {
    const search = new URLSearchParams()
    if (params.status) search.set("status", params.status)
    if (params.q) search.set("q", params.q)
    const qs = search.toString()
    return getCanonicalList<Savings>(
      `/api/deposit/savings${qs ? `?${qs}` : ""}`,
      requestOptions
    )
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
    postCanonical<DepositSubmission>(
      `/api/deposit/savings/${encodeURIComponent(savingsCode)}/settle`,
      {}
    ),
  depositAdditional: (
    savingsCode: string,
    body: { amount_minor: number; txn_date?: string }
  ) =>
    postCanonical<DepositSubmission>(
      `/api/deposit/savings/${encodeURIComponent(savingsCode)}/deposit`,
      body
    ),
  listInterbank: (
    params: { status?: string } = {},
    requestOptions?: ApiRequestOptions
  ) => {
    const search = new URLSearchParams()
    if (params.status) search.set("status", params.status)
    const qs = search.toString()
    return getCanonicalList<InterbankDeposit>(
      `/api/deposit/interbank${qs ? `?${qs}` : ""}`,
      requestOptions
    )
  },
  createInterbank: (body: {
    deposit_code: string
    counterparty_code: string
    counterparty_name?: string
    product_code?: string
    deposit_date: string
    maturity_date: string
    principal_minor: number
    interest_rate: number
    currency_code?: string
  }) => postCanonical<InterbankDeposit>("/api/deposit/interbank", body),
  getInterbank: (id: string) =>
    getCanonical<IbmDetail>(`/api/deposit/interbank/${encodeURIComponent(id)}`),
  submitIbmMovement: (
    depositId: string,
    body: {
      kind: "TOP_UP" | "INTEREST" | "EXPECTED" | "WITHDRAW"
      amount_minor: number
      movement_date: string
      period_from?: string
      period_to?: string
      note?: string
    }
  ) =>
    postCanonical<IbmMovement>(
      `/api/deposit/interbank/${encodeURIComponent(depositId)}/movements`,
      body
    ),
  listIbmProducts: (includeInactive = false) =>
    getCanonicalList<IbmProduct>(
      `/api/deposit/ibm-products${includeInactive ? "?include_inactive=true" : ""}`
    ),
  upsertIbmProduct: (body: Partial<IbmProduct>) =>
    postCanonical<IbmProduct>("/api/deposit/ibm-products", body),

  listInterestRates: (productCode?: string) =>
    getCanonicalList<InterestRate>(
      `/api/deposit/rates${productCode ? `?product_code=${encodeURIComponent(productCode)}` : ""}`
    ),
  submitRate: (body: {
    request_type: "REGISTER" | "EDIT" | "ADJUST"
    payload: {
      product_code?: string
      term_months: number
      method?: string
      denominator?: number
      rate: number
      effective_from: string
    }
  }) =>
    postCanonical<{ id: string; status: string; workflow_case_id?: string }>(
      "/api/deposit/rates",
      body
    ),
  getRateRequest: (id: string) =>
    getCanonical<RateRequest>(`/api/deposit/rates/${encodeURIComponent(id)}`),
  getSavings: (code: string) =>
    getCanonical<SavingsDetail>(
      `/api/deposit/savings/${encodeURIComponent(code)}`
    ),
  submitSavingsInterest: (
    code: string,
    body: { op_type: "PAY" | "CAPITALIZE"; amount_minor: number }
  ) =>
    postCanonical<InterestOp>(
      `/api/deposit/savings/${encodeURIComponent(code)}/interest`,
      body
    ),
  submitBatchInterest: () =>
    postCanonical<{ items: InterestOp[]; total: number }>(
      "/api/deposit/batch-interest",
      {}
    ),

  depositStatement: (
    params: { from?: string; to?: string; status?: string } = {}
  ) =>
    getCanonicalList<DepositStatementRow>(
      `/api/deposit/reports/deposit-statement${reportQuery(params)}`
    ),
  depositTransactions: (
    params: { from?: string; to?: string; txn_type?: string } = {}
  ) =>
    getCanonicalList<DepositTxnRow>(
      `/api/deposit/reports/deposit-transactions${reportQuery(params)}`
    ),
  interbankStatement: (
    params: { from?: string; to?: string; status?: string } = {}
  ) =>
    getCanonicalList<InterbankStatementRow>(
      `/api/deposit/reports/interbank-statement${reportQuery(params)}`
    ),
  interbankTransactions: (params: { from?: string; to?: string } = {}) =>
    getCanonicalList<InterbankTxnRow>(
      `/api/deposit/reports/interbank-transactions${reportQuery(params)}`
    ),
}

function reportQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ""
}
