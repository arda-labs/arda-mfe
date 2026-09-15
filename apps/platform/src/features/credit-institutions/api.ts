import {
  deleteCanonical,
  getCanonical,
  getCanonicalList,
  postCanonical,
  putCanonical,
} from "@workspace/api"
import type { ApiRequestOptions } from "@workspace/api/client"
import { buildListSearchParams } from "@workspace/api/list"
import { buildSearchParams } from "@workspace/api/query"
import type { CreditInstitution } from "./types"

export const creditInstitutionsApi = {
  /**
   * Legacy fetch: full bare array (no page/per_page params → BE legacy mode).
   */
  listCreditInstitutions: (params?: { status?: string; q?: string }) => {
    const q = buildSearchParams({
      status: params?.status,
      q: params?.q,
    })
    return getCanonical<CreditInstitution[]>(
      `/api/platform/credit-institutions?${q.toString()}`
    )
  },
  /**
   * Paged fetch for the admin catalog: page/per_page trigger the BE paged
   * envelope. Sort keys must stay within the BE whitelist: code, name,
   * status, created_at.
   */
  listCreditInstitutionsPaged: (
    params: {
      page?: number
      perPage?: number
      q?: string
      status?: string
      sort?: string
      order?: "asc" | "desc"
    } = {},
    requestOptions?: ApiRequestOptions
  ) => {
    const search = buildListSearchParams({
      page: params.page ?? 1,
      perPage: params.perPage ?? 20,
      sort: params.sort,
      order: params.order,
      q: params.q,
      status: params.status,
    })
    return getCanonicalList<CreditInstitution>(
      `/api/platform/credit-institutions?${search.toString()}`,
      requestOptions
    )
  },
  getCreditInstitution: (id: string) => {
    return getCanonical<CreditInstitution>(
      `/api/platform/credit-institutions/${id}`
    )
  },
  createCreditInstitution: (data: Partial<CreditInstitution>) => {
    return postCanonical<CreditInstitution>(
      "/api/platform/credit-institutions",
      data
    )
  },
  updateCreditInstitution: (id: string, data: Partial<CreditInstitution>) => {
    return putCanonical<CreditInstitution>(
      `/api/platform/credit-institutions/${id}`,
      data
    )
  },
  deleteCreditInstitution: (id: string) => {
    return deleteCanonical<{ ok: boolean }>(
      `/api/platform/credit-institutions/${id}`
    )
  },
}
