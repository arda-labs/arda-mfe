import type { ListResponse } from "@workspace/api/list"
import { buildSearchParams } from "@workspace/api/query"
import { getCanonical } from "@workspace/api"

export interface GeoAdminUnit {
  code: string
  name: string
  full_name?: string
  parent_code?: string
  level: number
  unit_type: string
  is_active: boolean
}

export interface PlatformArea {
  id: string
  code: string
  name: string
  area_type_code: string
  admin_unit_code?: string
  status: "active" | "inactive"
}

export interface PlatformOrganization {
  id: string
  code: string
  name: string
  is_active: boolean
}

export const platformReferenceApi = {
  listGeoAdminUnits(params?: { parentCode?: string; level?: number }) {
    const q = buildSearchParams({
      parent_code: params?.parentCode,
      level: params?.level,
    })
    const suffix = q.size ? `?${q.toString()}` : ""
    return getCanonical<GeoAdminUnit[]>(
      `/api/platform/geo/admin-units${suffix}`
    )
  },
  listAreas(params?: { status?: string; q?: string; adminUnitCode?: string }) {
    const q = buildSearchParams({
      status: params?.status,
      q: params?.q,
      admin_unit_code: params?.adminUnitCode,
    })
    const suffix = q.size ? `?${q.toString()}` : ""
    return getCanonical<PlatformArea[]>(`/api/platform/areas${suffix}`)
  },
  listOrganizations(params?: { all?: boolean; is_active?: boolean }) {
    const q = buildSearchParams({
      all: params?.all ? "1" : undefined,
      is_active: params?.is_active,
    })
    const suffix = q.size ? `?${q.toString()}` : ""
    return getCanonical<ListResponse<PlatformOrganization>>(
      `/api/platform/organizations${suffix}`
    )
  },
}
