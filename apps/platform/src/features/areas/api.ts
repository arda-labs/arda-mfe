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
import type { Area } from "./types"

export const areasApi = {
  /**
   * Legacy fetch: full bare array (no page/per_page params → BE legacy mode).
   */
  listAreas: (params?: {
    status?: string
    areaTypeCode?: string
    parentId?: string
    q?: string
  }) => {
    const q = buildSearchParams({
      status: params?.status,
      area_type_code: params?.areaTypeCode,
      parent_id: params?.parentId,
      q: params?.q,
    })
    return getCanonical<Area[]>(`/api/platform/areas?${q.toString()}`)
  },
  /**
   * Paged fetch for the admin catalog: page/per_page trigger the BE paged
   * envelope. Sort keys must stay within the BE whitelist: code, name,
   * area_type_code, status, created_at.
   */
  listAreasPaged: (
    params: {
      page?: number
      perPage?: number
      q?: string
      status?: string
      areaTypeCode?: string
      parentId?: string
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
      area_type_code: params.areaTypeCode,
      parent_id: params.parentId,
    })
    return getCanonicalList<Area>(
      `/api/platform/areas?${search.toString()}`,
      requestOptions
    )
  },
  getArea: (id: string) => {
    return getCanonical<Area>(`/api/platform/areas/${id}`)
  },
  createArea: (data: Partial<Area>) => {
    return postCanonical<Area>("/api/platform/areas", data)
  },
  updateArea: (id: string, data: Partial<Area>) => {
    return putCanonical<Area>(`/api/platform/areas/${id}`, data)
  },
  deleteArea: (id: string) => {
    return deleteCanonical<{ ok: boolean }>(`/api/platform/areas/${id}`)
  },
}
