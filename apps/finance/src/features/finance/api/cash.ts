import { api, type ApiSuccess } from "@workspace/api"
import { type ListResponse } from "@workspace/api/list"
import { buildSearchParams } from "@workspace/api/query"

/** VCM cash transactions (W7). */
export interface CashTxn {
  txn_date: string
  direction: "IN" | "OUT"
  amount_minor: number
  currency_code: string
  org_code?: string
  description?: string
  journal_entry_id?: string
}

export interface CashPositionRow {
  txn_date: string
  currency_code: string
  cash_in_minor: number
  cash_out_minor: number
  net_minor: number
}

export function listCash(
  params: { from?: string; to?: string; direction?: string } = {}
) {
  const search = buildSearchParams({
    from: params.from,
    to: params.to,
    direction: params.direction,
  })
  const qs = search.toString()
  return api
    .get<ApiSuccess<ListResponse<CashTxn>>>(
      `/api/finance/cash${qs ? `?${qs}` : ""}`
    )
    .then((res) => res.result)
}

export function recordCash(body: {
  txn_date: string
  direction: "IN" | "OUT"
  amount_minor: number
  currency_code?: string
  description?: string
}) {
  return api
    .post<ApiSuccess<CashTxn>>("/api/finance/cash", body)
    .then((res) => res.result)
}

export function cashPosition() {
  return api
    .get<ApiSuccess<{ rows: CashPositionRow[] }>>("/api/finance/cash-position")
    .then((res) => res.result.rows)
}
