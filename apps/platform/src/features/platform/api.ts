import { api, type ApiSuccess } from "@workspace/api"
import type { ApiRequestOptions } from "@workspace/api/client"
import {
  buildListSearchParams,
  type ListQueryInput,
  type ListResponse,
} from "@workspace/api/list"
import { buildSearchParams } from "@workspace/api/query"

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

function getCanonical<T>(path: string, options?: ApiRequestOptions) {
  return api
    .get<ApiSuccess<T>>(path, options)
    .then((response) => response.result)
}

function postCanonical<T>(path: string, body?: unknown) {
  return api
    .post<ApiSuccess<T>>(path, body)
    .then((response) => response.result)
}

function putCanonical<T>(path: string, body?: unknown) {
  return api
    .put<ApiSuccess<T>>(path, body)
    .then((response) => response.result)
}

function deleteCanonical<T>(path: string) {
  return api
    .delete<ApiSuccess<T>>(path)
    .then((response) => response?.result)
}

function getCanonicalList<T>(path: string, options?: ApiRequestOptions) {
  return api
    .get<ApiSuccess<ListResponse<T>>>(path, options)
    .then((response) => response.result)
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
    return getCanonicalList<Organization>(
      `/api/platform/organizations?${search.toString()}`,
      requestOptions
    )
  },
  getOrganization: (id: string) => {
    return getCanonical<Organization>(`/api/platform/organizations/${id}`)
  },
  createOrganization: (data: Partial<Organization>) => {
    return postCanonical<Organization>("/api/platform/organizations", data)
  },
  updateOrganization: (id: string, data: Partial<Organization>) => {
    return putCanonical<Organization>(`/api/platform/organizations/${id}`, data)
  },
  deleteOrganization: (id: string) => {
    return deleteCanonical<{ ok: boolean }>(`/api/platform/organizations/${id}`)
  },

  // Parameters
  listParameters: (params?: {
    scopeType?: string
    scopeId?: string
  }) => {
    const q = buildSearchParams({
      scope_type: params?.scopeType,
      scope_id: params?.scopeId,
    })
    return getCanonical<Parameter[]>(`/api/platform/parameters?${q.toString()}`)
  },
  upsertParameter: (data: Partial<Parameter>) => {
    return postCanonical<Parameter>("/api/platform/parameters", data)
  },
  deleteParameter: (id: string) => {
    return deleteCanonical<{ ok: boolean }>(`/api/platform/parameters/${id}`)
  },

  // Lookup Categories
  listLookupCategories: (params?: {
    scopeType?: string
    scopeId?: string
  }) => {
    const q = buildSearchParams({
      scope_type: params?.scopeType,
      scope_id: params?.scopeId,
    })
    return getCanonical<LookupCategory[]>(`/api/platform/lookups?${q.toString()}`)
  },
  upsertLookupCategory: (data: Partial<LookupCategory>) => {
    return postCanonical<LookupCategory>("/api/platform/lookups", data)
  },
  deleteLookupCategory: (id: string) => {
    return deleteCanonical<{ ok: boolean }>(`/api/platform/lookups/${id}/delete`)
  },

  // Lookup Values
  listLookupValues: (categoryCode: string) => {
    return getCanonical<LookupValue[]>(
      `/api/platform/lookups/${categoryCode}/values`
    )
  },
  createLookupValue: (categoryCode: string, data: Partial<LookupValue>) => {
    return postCanonical<LookupValue>(
      `/api/platform/lookups/${categoryCode}/values`,
      data
    )
  },
  upsertLookupValue: (categoryCode: string, data: Partial<LookupValue>) => {
    return postCanonical<LookupValue>(
      `/api/platform/lookups/${categoryCode}/values`,
      data
    )
  },
  deleteLookupValue: (id: string) => {
    return deleteCanonical<{ ok: boolean }>(`/api/platform/lookup-values/${id}`)
  },

  // Geo Admin Units
  listGeoAdminUnits: (parentCode?: string, level?: number) => {
    const q = buildSearchParams({ parent_code: parentCode, level })
    return getCanonical<GeoAdminUnit[]>(
      `/api/platform/geo/admin-units?${q.toString()}`
    )
  },
  upsertGeoAdminUnit: (data: Partial<GeoAdminUnit>) => {
    return postCanonical<GeoAdminUnit>("/api/platform/geo/admin-units", data)
  },

  // Credit Institutions
  listCreditInstitutions: (params?: {
    status?: string
    q?: string
  }) => {
    const q = buildSearchParams({
      status: params?.status,
      q: params?.q,
    })
    return getCanonical<CreditInstitution[]>(
      `/api/platform/credit-institutions?${q.toString()}`
    )
  },
  getCreditInstitution: (id: string) => {
    return getCanonical<CreditInstitution>(`/api/platform/credit-institutions/${id}`)
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

  // Areas
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

  // File Templates
  listFileTemplates: () => {
    return getCanonical<FileTemplate[]>("/api/platform/templates")
  },
  getFileTemplate: (id: string) => {
    return getCanonical<FileTemplate>(`/api/platform/templates/${id}`)
  },
  createFileTemplate: (data: Partial<FileTemplate>) => {
    return postCanonical<FileTemplate>("/api/platform/templates", data)
  },
  updateFileTemplate: (id: string, data: Partial<FileTemplate>) => {
    return putCanonical<FileTemplate>(`/api/platform/templates/${id}`, data)
  },
  deleteFileTemplate: (id: string) => {
    return deleteCanonical<{ ok: boolean }>(`/api/platform/templates/${id}`)
  },

  // Calendar & Cut-off
  getCalendarStatus: (branchCode?: string) =>
    getCanonical<SystemDate>(
      `/api/platform/calendar/status?branchCode=${branchCode || "HEAD_OFFICE"}`
    ),
  triggerEOD: (branchCode?: string) =>
    postCanonical<{ message: string; data: SystemDate }>(
      `/api/platform/calendar/eod?branchCode=${branchCode || "HEAD_OFFICE"}`
    ),
  evaluateDate: (channel: string, type: string, time?: string) => {
    const p = buildSearchParams({ channel, type, time })
    return getCanonical<{
      channel: string
      type: string
      executionTime: string
      accountingDate: string
    }>(`/api/platform/calendar/evaluate?${p.toString()}`)
  },
  listHolidays: () =>
    getCanonical<HolidayCalendar[]>("/api/platform/calendar/holidays"),
  addHoliday: (data: {
    date: string
    description: string
    isRecurring: boolean
  }) => postCanonical<HolidayCalendar>("/api/platform/calendar/holidays", data),
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
