import { api } from "@workspace/api"
import type { ListResponse } from "@workspace/core/http/list-api"

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
    const q = new URLSearchParams()
    if (params?.parentCode) q.set("parent_code", params.parentCode)
    if (params?.level) q.set("level", String(params.level))
    const suffix = q.size ? `?${q.toString()}` : ""
    return api.get<GeoAdminUnit[]>(`/api/platform/geo/admin-units${suffix}`)
  },
  listAreas(params?: { status?: string; q?: string; adminUnitCode?: string }) {
    const q = new URLSearchParams()
    if (params?.status) q.set("status", params.status)
    if (params?.q) q.set("q", params.q)
    if (params?.adminUnitCode) q.set("admin_unit_code", params.adminUnitCode)
    const suffix = q.size ? `?${q.toString()}` : ""
    return api.get<PlatformArea[]>(`/api/platform/areas${suffix}`)
  },
  listOrganizations(params?: { all?: boolean; is_active?: boolean }) {
    const q = new URLSearchParams()
    if (params?.all) q.set("all", "1")
    if (params?.is_active !== undefined) {
      q.set("is_active", String(params.is_active))
    }
    const suffix = q.size ? `?${q.toString()}` : ""
    return api.get<ListResponse<PlatformOrganization>>(
      `/api/platform/organizations${suffix}`
    )
  },
}
