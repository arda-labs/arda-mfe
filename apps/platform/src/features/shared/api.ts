import { getCanonical, getCanonicalList, postCanonical } from "@workspace/api"
import type { ApiRequestOptions } from "@workspace/api/client"
import { buildListSearchParams } from "@workspace/api/list"
import { buildSearchParams } from "@workspace/api/query"
import type { GeoAdminUnit } from "./types"

/** Pure query builder — unit-tested in apps/platform/tests/feature-api.test.ts. */
export function geoAdminUnitsListSearch(
  params: {
    page?: number
    perPage?: number
    q?: string
    parentCode?: string
    level?: number
    sort?: string
    order?: "asc" | "desc"
  } = {}
) {
  const search = buildListSearchParams({
    page: params.page ?? 1,
    perPage: params.perPage ?? 20,
    sort: params.sort,
    order: params.order,
    q: params.q,
  })
  const extra = buildSearchParams({
    parent_code: params.parentCode,
    level: params.level,
  })
  extra.forEach((value, key) => search.set(key, value))
  return search
}

/**
 * Geo admin units — shared reference data used by provinces, wards and areas.
 * Wire source: arda-be/apps/platform-service (geo admin unit handlers).
 */
export const geoApi = {
  /**
   * Legacy lookup fetch: returns the full bare array (no page/per_page params,
   * so the BE keeps legacy mode). Used by dropdown/tree consumers.
   */
  listGeoAdminUnits: (parentCode?: string, level?: number) => {
    const q = buildSearchParams({ parent_code: parentCode, level })
    return getCanonical<GeoAdminUnit[]>(
      `/api/platform/geo/admin-units?${q.toString()}`
    )
  },
  /**
   * Paged fetch for the admin wards catalog: page/per_page trigger the BE
   * paged envelope (items/page/per_page/total). Sort keys must stay within
   * the BE whitelist: code, name, created_at.
   */
  listGeoAdminUnitsPaged: (
    params: {
      page?: number
      perPage?: number
      q?: string
      parentCode?: string
      level?: number
      sort?: string
      order?: "asc" | "desc"
    } = {},
    requestOptions?: ApiRequestOptions
  ) => {
    const search = geoAdminUnitsListSearch(params)
    return getCanonicalList<GeoAdminUnit>(
      `/api/platform/geo/admin-units?${search.toString()}`,
      requestOptions
    )
  },
  upsertGeoAdminUnit: (data: Partial<GeoAdminUnit>) => {
    return postCanonical<GeoAdminUnit>("/api/platform/geo/admin-units", data)
  },
}
