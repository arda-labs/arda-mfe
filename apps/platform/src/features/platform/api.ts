import { api } from "@workspace/api"
import type { ApiRequestOptions } from "@workspace/core/http/api-client"
import {
  buildListSearchParams,
  type ListQueryInput,
  type ListResponse,
} from "@workspace/core/http/list-api"

export interface Organization {
  id: string
  tenant_id: string
  parent_id?: string
  parent_name?: string
  code: string
  name: string
  admin_unit_code?: string
  address?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface Parameter {
  id: string
  tenant_id?: string
  key: string
  value: string
  value_type: "string" | "number" | "boolean" | "json" | "date"
  scope_type: "global" | "tenant" | "org" | "branch" | "department"
  scope_id?: string
  description?: string
  is_secret: boolean
  created_at?: string
  updated_at?: string
}

export interface LookupCategory {
  id: string
  tenant_id?: string
  code: string
  name: string
  scope_type: "global" | "tenant" | "org" | "branch" | "department"
  scope_id?: string
  is_system: boolean
  description?: string
  created_at?: string
  updated_at?: string
}

export interface LookupValue {
  id: string
  category_id: string
  code: string
  name: string
  sort_order: number
  is_active: boolean
  metadata?: string
  created_at?: string
  updated_at?: string
}

export interface GeoAdminUnit {
  code: string
  name: string
  full_name?: string
  parent_code?: string
  level: number
  unit_type: string
  country_code: string
  region_code?: string
  effective_from?: string
  effective_to?: string
  is_active: boolean
  metadata?: string
  created_at?: string
  updated_at?: string
}

export interface CreditInstitution {
  id: string
  tenant_id: string
  code: string
  name: string
  address: string
  status: "active" | "inactive"
  effective_from?: string
  short_name?: string
  phone?: string
  email?: string
  license_no?: string
  license_date?: string
  tax_code?: string
  website?: string
  note?: string
  created_at?: string
  updated_at?: string
}

export interface Area {
  id: string
  tenant_id: string
  parent_id?: string
  code: string
  name: string
  area_type_code: string
  admin_unit_code?: string
  description?: string
  status: "active" | "inactive"
  effective_from?: string
  effective_to?: string
  created_at?: string
  updated_at?: string
}

export interface FileTemplate {
  id: string
  tenant_id: string
  code: string
  name: string
  description?: string
  file_type: string
  file_url: string
  mapping_config?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export type OrganizationsListParams = ListQueryInput & {
  is_active?: string
}

export const platformApi = {
  // Organizations
  listOrganizations: (
    params: OrganizationsListParams = {},
    requestOptions?: ApiRequestOptions
  ) => {
    const search = buildListSearchParams({
      page: params.page ?? 1,
      perPage: params.perPage ?? 20,
      sort: params.sort,
      order: params.order,
      q: params.q,
      view: params.view,
      all: params.all,
      is_active: params.is_active,
    })
    return api.get<ListResponse<Organization>>(
      `/api/platform/organizations?${search.toString()}`,
      requestOptions
    )
  },
  getOrganization: (id: string) => {
    return api.get<Organization>(`/api/platform/organizations/${id}`)
  },
  createOrganization: (data: Partial<Organization>) => {
    return api.post<Organization>("/api/platform/organizations", data)
  },
  updateOrganization: (id: string, data: Partial<Organization>) => {
    return api.put<Organization>(`/api/platform/organizations/${id}`, data)
  },
  deleteOrganization: (id: string) => {
    return api.delete<{ ok: boolean }>(`/api/platform/organizations/${id}`)
  },

  // Parameters
  listParameters: (params?: {
    tenantId?: string
    scopeType?: string
    scopeId?: string
  }) => {
    const q = new URLSearchParams()
    if (params?.tenantId) q.set("tenant_id", params.tenantId)
    if (params?.scopeType) q.set("scope_type", params.scopeType)
    if (params?.scopeId) q.set("scope_id", params.scopeId)
    return api.get<Parameter[]>(`/api/platform/parameters?${q.toString()}`)
  },
  upsertParameter: (data: Partial<Parameter>) => {
    return api.post<Parameter>("/api/platform/parameters", data)
  },
  deleteParameter: (id: string) => {
    return api.delete<{ ok: boolean }>(`/api/platform/parameters/${id}`)
  },

  // Lookup Categories
  listLookupCategories: (params?: {
    tenantId?: string
    scopeType?: string
    scopeId?: string
  }) => {
    const q = new URLSearchParams()
    if (params?.tenantId) q.set("tenant_id", params.tenantId)
    if (params?.scopeType) q.set("scope_type", params.scopeType)
    if (params?.scopeId) q.set("scope_id", params.scopeId)
    return api.get<LookupCategory[]>(`/api/platform/lookups?${q.toString()}`)
  },
  upsertLookupCategory: (data: Partial<LookupCategory>) => {
    return api.post<LookupCategory>("/api/platform/lookups", data)
  },
  deleteLookupCategory: (id: string) => {
    return api.delete<{ ok: boolean }>(`/api/platform/lookups/${id}/delete`)
  },

  // Lookup Values
  listLookupValues: (categoryCode: string) => {
    return api.get<LookupValue[]>(
      `/api/platform/lookups/${categoryCode}/values`
    )
  },
  createLookupValue: (categoryCode: string, data: Partial<LookupValue>) => {
    return api.post<LookupValue>(
      `/api/platform/lookups/${categoryCode}/values`,
      data
    )
  },
  upsertLookupValue: (categoryCode: string, data: Partial<LookupValue>) => {
    return api.post<LookupValue>(
      `/api/platform/lookups/${categoryCode}/values`,
      data
    )
  },
  deleteLookupValue: (id: string) => {
    return api.delete<{ ok: boolean }>(`/api/platform/lookup-values/${id}`)
  },

  // Geo Admin Units
  listGeoAdminUnits: (parentCode?: string, level?: number) => {
    const q = new URLSearchParams()
    if (parentCode) q.set("parent_code", parentCode)
    if (level) q.set("level", String(level))
    return api.get<GeoAdminUnit[]>(
      `/api/platform/geo/admin-units?${q.toString()}`
    )
  },
  upsertGeoAdminUnit: (data: Partial<GeoAdminUnit>) => {
    return api.post<GeoAdminUnit>("/api/platform/geo/admin-units", data)
  },

  // Credit Institutions
  listCreditInstitutions: (params?: {
    tenantId?: string
    status?: string
    q?: string
  }) => {
    const q = new URLSearchParams()
    if (params?.tenantId) q.set("tenant_id", params.tenantId)
    if (params?.status) q.set("status", params.status)
    if (params?.q) q.set("q", params.q)
    return api.get<CreditInstitution[]>(
      `/api/platform/credit-institutions?${q.toString()}`
    )
  },
  getCreditInstitution: (id: string) => {
    return api.get<CreditInstitution>(`/api/platform/credit-institutions/${id}`)
  },
  createCreditInstitution: (data: Partial<CreditInstitution>) => {
    return api.post<CreditInstitution>(
      "/api/platform/credit-institutions",
      data
    )
  },
  updateCreditInstitution: (id: string, data: Partial<CreditInstitution>) => {
    return api.put<CreditInstitution>(
      `/api/platform/credit-institutions/${id}`,
      data
    )
  },
  deleteCreditInstitution: (id: string) => {
    return api.delete<{ ok: boolean }>(
      `/api/platform/credit-institutions/${id}`
    )
  },

  // Areas
  listAreas: (params?: {
    tenantId?: string
    status?: string
    areaTypeCode?: string
    parentId?: string
    q?: string
  }) => {
    const q = new URLSearchParams()
    if (params?.tenantId) q.set("tenant_id", params.tenantId)
    if (params?.status) q.set("status", params.status)
    if (params?.areaTypeCode) q.set("area_type_code", params.areaTypeCode)
    if (params?.parentId) q.set("parent_id", params.parentId)
    if (params?.q) q.set("q", params.q)
    return api.get<Area[]>(`/api/platform/areas?${q.toString()}`)
  },
  getArea: (id: string) => {
    return api.get<Area>(`/api/platform/areas/${id}`)
  },
  createArea: (data: Partial<Area>) => {
    return api.post<Area>("/api/platform/areas", data)
  },
  updateArea: (id: string, data: Partial<Area>) => {
    return api.put<Area>(`/api/platform/areas/${id}`, data)
  },
  deleteArea: (id: string) => {
    return api.delete<{ ok: boolean }>(`/api/platform/areas/${id}`)
  },

  // File Templates
  listFileTemplates: (tenantId?: string) => {
    const params = new URLSearchParams()
    if (tenantId) params.set("tenant_id", tenantId)
    return api.get<FileTemplate[]>(
      `/api/platform/templates?${params.toString()}`
    )
  },
  getFileTemplate: (id: string) => {
    return api.get<FileTemplate>(`/api/platform/templates/${id}`)
  },
  createFileTemplate: (data: Partial<FileTemplate>) => {
    return api.post<FileTemplate>("/api/platform/templates", data)
  },
  updateFileTemplate: (id: string, data: Partial<FileTemplate>) => {
    return api.put<FileTemplate>(`/api/platform/templates/${id}`, data)
  },
  deleteFileTemplate: (id: string) => {
    return api.delete<{ ok: boolean }>(`/api/platform/templates/${id}`)
  },

  // Calendar & Cut-off
  getCalendarStatus: (branchCode?: string) =>
    api.get<SystemDate>(
      `/api/platform/calendar/status?branchCode=${branchCode || "HEAD_OFFICE"}`
    ),
  triggerEOD: (branchCode?: string) =>
    api.post<{ message: string; data: SystemDate }>(
      `/api/platform/calendar/eod?branchCode=${branchCode || "HEAD_OFFICE"}`
    ),
  evaluateDate: (channel: string, type: string, time?: string) => {
    const p = new URLSearchParams()
    p.set("channel", channel)
    p.set("type", type)
    if (time) p.set("time", time)
    return api.get<{
      channel: string
      type: string
      executionTime: string
      accountingDate: string
    }>(`/api/platform/calendar/evaluate?${p.toString()}`)
  },
  listHolidays: () =>
    api.get<HolidayCalendar[]>("/api/platform/calendar/holidays"),
  addHoliday: (data: {
    date: string
    description: string
    isRecurring: boolean
  }) => api.post<HolidayCalendar>("/api/platform/calendar/holidays", data),
}

export interface SystemDate {
  id: string
  branch_code: string
  current_business_date: string
  previous_business_date: string
  next_business_date: string
  status: string
  last_eod_at?: string
  updated_at: string
}

export interface HolidayCalendar {
  id: string
  holiday_date: string
  description: string
  is_recurring: boolean
  holiday_year?: number
  created_at: string
}
