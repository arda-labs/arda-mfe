import { api, type ApiSuccess } from "@workspace/api"
import {
  buildListSearchParams,
  type ListQueryInput,
  type ListResponse,
} from "@workspace/api/list"
import { buildSearchParams } from "@workspace/api/query"

export interface Account {
  id: string
  tenantId: string
  code: string
  name: string
  type: string
  normalBalance: string
  currency: string
  isActive: boolean
  parentId?: string
  createdAt: string
}

/** fin_coa_accounts row (COA v2 — the table posting validation resolves). */
export interface CoaAccount {
  id: string
  tenantId: string
  versionCode: string
  accCode: string
  name: string
  accType: string
  accNature: "DEBIT" | "CREDIT" | "B"
  parentCode?: string | null
  isInternal: boolean
  isPostable: boolean
  effectiveDate: string
  expiryDate?: string | null
  description?: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Normalizes the BE `{ accounts: [...] }` result (plus optional paging fields)
 * to the standard ListResponse — unit-tested in apps/finance/tests.
 */
export function normalizeAccountsPage(
  result: { accounts?: Account[] } & Partial<ListResponse<Account>>,
  params?: ListQueryInput
): ListResponse<Account> {
  const accounts = result.accounts ?? []
  return {
    items: accounts,
    page: result.page ?? params?.page ?? 1,
    per_page:
      result.per_page ?? params?.perPage ?? Math.max(accounts.length, 1),
    total: result.total ?? accounts.length,
  }
}

/**
 * Every page of a list, for catalogs shown whole (the chart of accounts
 * tree). The BE caps per_page at 100 and `all=1` at 500, so a large chart
 * is read page by page instead of being silently cut off.
 */
export async function fetchAllPages<T extends { id: string }>(
  fetchPage: (page: number) => Promise<ListResponse<T>>
): Promise<T[]> {
  const first = await fetchPage(1)
  const pageCount = Math.ceil(first.total / Math.max(first.per_page, 1))
  const rest =
    pageCount > 1
      ? await Promise.all(
          Array.from({ length: pageCount - 1 }, (_, index) => fetchPage(index + 2))
        )
      : []
  const seen = new Set<string>()
  return [first, ...rest]
    .flatMap((page) => page.items)
    .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
}

export const accountsApi = {
  listAccounts: () =>
    api
      .get<ApiSuccess<{ accounts: Account[] }>>("/api/finance/accounts")
      .then((res) => res.result),
  /**
   * Server-tier account list: q ILIKEs code+name, sort whitelist
   * (code | name | created_at), page/per_page. The BE keeps the
   * `{ accounts: [...] }` result shape and adds page/per_page/total — this
   * adapter normalizes it to the standard ListResponse for the data table.
   */
  listAccountsPaged: (params?: ListQueryInput) =>
    api
      .get<
        ApiSuccess<{ accounts: Account[] } & Partial<ListResponse<Account>>>
      >(`/api/finance/accounts?${buildListSearchParams(params).toString()}`)
      .then((res): ListResponse<Account> =>
        normalizeAccountsPage(res.result, params)
      ),
  /** The whole chart of accounts, ordered by code (for the tree view). */
  listAllAccounts: () =>
    fetchAllPages((page) =>
      accountsApi.listAccountsPaged({ page, perPage: 100, sort: "code", order: "asc" })
    ),
  getAccount: (id: string) =>
    api
      .get<ApiSuccess<Account>>(`/api/finance/accounts/${id}`)
      .then((res) => res.result),
  createAccount: (data: {
    code: string
    name: string
    type: string
    normalBalance: string
    currency?: string
    parentId?: string
  }) =>
    api
      .post<ApiSuccess<Account>>("/api/finance/accounts", data)
      .then((res) => res.result),
  /** Edit an account (code is immutable). */
  updateAccount: (
    id: string,
    data: {
      name?: string
      type?: string
      normalBalance?: string
      currency?: string
      isActive?: boolean
      parentId?: string
    }
  ) =>
    api
      .put<ApiSuccess<Account>>(
        `/api/finance/accounts/${encodeURIComponent(id)}`,
        data
      )
      .then((res) => res.result),
  /**
   * COA v2 chart (fin_coa_accounts) — the table the posting resolver
   * validates against. `nature` narrows to D | C | B (off-balance memo);
   * `version` pins a COA version, otherwise the tenant's active one. The BE
   * returns the full (unpaged) filtered set as the standard list envelope.
   */
  listCoaAccounts: (params?: { version?: string; nature?: string }) =>
    api
      .get<ApiSuccess<ListResponse<CoaAccount>>>(
        `/api/finance/coa/accounts?${buildSearchParams({
          version: params?.version,
          nature: params?.nature,
        }).toString()}`
      )
      .then((res) => res.result),
}
