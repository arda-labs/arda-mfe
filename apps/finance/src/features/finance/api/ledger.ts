import { api, type ApiSuccess } from "@workspace/api"
import { buildSearchParams } from "@workspace/api/query"

/** One posted ledger line for the per-account ledger view. */
export interface LedgerLine {
  entry_no: number
  entry_date: string
  document_type: string
  description: string
  debit_minor: number
  credit_minor: number
  entry_id: string
}

export interface LedgerResult {
  account_code: string
  opening_minor: number
  lines: LedgerLine[]
}

/** Per-account ledger (sổ cái/sổ chi tiết) for [from, to]. */
export function getLedger(params: {
  account: string
  from: string
  to: string
}) {
  const search = buildSearchParams({
    account: params.account,
    from: params.from,
    to: params.to,
  })
  return api
    .get<ApiSuccess<LedgerResult>>(`/api/finance/ledger?${search.toString()}`)
    .then((res) => res.result)
}
