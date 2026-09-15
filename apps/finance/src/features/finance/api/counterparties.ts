import { api, type ApiSuccess } from "@workspace/api"
import { type ListResponse } from "@workspace/api/list"
import { buildSearchParams } from "@workspace/api/query"

/** Counterparty master types + API (W4c-E). */
export interface Counterparty {
  id: string
  tenant_id: string
  code: string
  name: string
  party_type: string
  org_code?: string
  note?: string
  is_active: boolean
  created_at?: string
}

export interface CounterpartyAccount {
  id: string
  counterparty_id: string
  account_no: string
  bank_code?: string
  coa_account_code?: string
  currency_code: string
  is_default: boolean
}

export const counterpartyApi = {
  list: (
    params: { q?: string; party_type?: string; include_inactive?: boolean } = {}
  ) => {
    const search = buildSearchParams({
      q: params.q,
      party_type: params.party_type,
      include_inactive: params.include_inactive ? "true" : undefined,
    })
    const suffix = search.size ? `?${search.toString()}` : ""
    return api
      .get<ApiSuccess<ListResponse<Counterparty>>>(
        `/api/finance/counterparties${suffix}`
      )
      .then((res) => res.result)
  },
  upsert: (body: Partial<Counterparty>) =>
    api
      .post<ApiSuccess<Counterparty>>("/api/finance/counterparties", body)
      .then((res) => res.result),
  update: (id: string, body: Partial<Counterparty>) =>
    api
      .put<ApiSuccess<Counterparty>>(
        `/api/finance/counterparties/${encodeURIComponent(id)}`,
        body
      )
      .then((res) => res.result),
  deactivate: (id: string) =>
    api
      .delete<ApiSuccess<{ ok: boolean }>>(
        `/api/finance/counterparties/${encodeURIComponent(id)}`
      )
      .then((res) => res.result),
  listAccounts: (id: string) =>
    api
      .get<ApiSuccess<ListResponse<CounterpartyAccount>>>(
        `/api/finance/counterparties/${encodeURIComponent(id)}/accounts`
      )
      .then((res) => res.result),
  upsertAccount: (id: string, body: Partial<CounterpartyAccount>) =>
    api
      .post<ApiSuccess<CounterpartyAccount>>(
        `/api/finance/counterparties/${encodeURIComponent(id)}/accounts`,
        body
      )
      .then((res) => res.result),
}
