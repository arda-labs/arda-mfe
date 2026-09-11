import {
  deleteCanonical,
  getCanonical,
  getCanonicalList,
  postCanonical,
  putCanonical,
} from "@workspace/api"
import type { ApiRequestOptions } from "@workspace/api/client"
import {
  buildListSearchParams,
  type ListQueryInput,
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
    return getCanonicalList<GeoAdminUnit>(
      `/api/platform/geo/admin-units?${search.toString()}`,
      requestOptions
    )
  },
  upsertGeoAdminUnit: (data: Partial<GeoAdminUnit>) => {
    return postCanonical<GeoAdminUnit>("/api/platform/geo/admin-units", data)
  },

  // Credit Institutions
  /**
   * Legacy fetch: full bare array (no page/per_page params → BE legacy mode).
   */
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

  // AI Assistant Settings
  getAISettings: () => getCanonical<AISettings>("/api/ai/settings"),
  updateAISettings: (data: Partial<AISettings>) =>
    putCanonical<{ saved: boolean }>("/api/ai/settings", data),
  testAIConnection: (data: TestConnectionRequest) =>
    postCanonical<TestConnectionResult>("/api/ai/settings/test", data),
}

export interface AISettings {
  providerType: string
  baseUrl: string
  apiKey: string
  modelId: string
  temperature: number
  isActive: boolean
  hasApiKey?: boolean
}

export interface TestConnectionRequest {
  providerType: string
  baseUrl: string
  apiKey: string
  modelId: string
}

export interface TestConnectionResult {
  success: boolean
  latencyMs?: number
  modelId?: string
  message?: string
  error?: string
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

/** COB job definitions + run history (W6). */
export interface JobDefinition {
  code: string
  name: string
  sequence: number
  endpoint: string
  is_enabled: boolean
}

export interface JobRun {
  job_code: string
  business_date: string
  status: string
  error?: string
  started_at?: string
  finished_at?: string
}

export interface CobRunResult {
  business_date: string
  steps: { job_code: string; status: string; error?: string }[]
}

export function listJobs() {
  return getCanonicalList<JobDefinition>("/api/platform/jobs")
}

export function listJobRuns(params: { job_code?: string; limit?: number } = {}) {
  const search = new URLSearchParams()
  if (params.job_code) search.set("job_code", params.job_code)
  if (params.limit !== undefined) search.set("limit", String(params.limit))
  const qs = search.toString()
  return getCanonicalList<JobRun>(`/api/platform/jobs/runs${qs ? `?${qs}` : ""}`)
}

export function runCob(businessDate: string) {
  return postCanonical<CobRunResult>(
    `/api/platform/eod/run?business_date=${encodeURIComponent(businessDate)}`,
    {}
  )
}

export function seedCob() {
  return postCanonical<{ seeded: boolean }>("/api/platform/eod/seed", {})
}

/** Working hours (ca làm việc, W6a). */
export interface WorkingHour {
  id: string
  org_code?: string
  day_of_week: number
  start_time: string
  end_time: string
  break_minutes: number
  is_active: boolean
}

export function listWorkingHours(orgCode = "") {
  return getCanonicalList<WorkingHour>(
    `/api/platform/working-hours${orgCode ? `?org_code=${encodeURIComponent(orgCode)}` : ""}`
  )
}

export function upsertWorkingHour(body: Partial<WorkingHour>) {
  return postCanonical<WorkingHour>("/api/platform/working-hours", body)
}

export function deleteWorkingHour(id: string) {
  return deleteCanonical<{ ok: boolean }>(
    `/api/platform/working-hours/${encodeURIComponent(id)}`
  )
}

/** Notification templates + sender configs (X2). */
export interface NotificationTemplate {
  id: string
  event_code: string
  channel: string
  locale: string
  subject: string
  body: string
  is_active: boolean
}

export interface NotificationSender {
  id: string
  channel: string
  host: string
  port: number
  username?: string
  has_password?: boolean
  from_address: string
  from_name?: string
  use_tls: boolean
  is_active: boolean
}

export function listNotificationTemplates() {
  return getCanonical<{ items: NotificationTemplate[] }>(
    "/api/notifications/templates"
  ).then((res) => res.items)
}

export function upsertNotificationTemplate(body: Partial<NotificationTemplate>) {
  return postCanonical<NotificationTemplate>("/api/notifications/templates", body)
}

export function deleteNotificationTemplate(id: string) {
  return deleteCanonical<{ ok: boolean }>(
    `/api/notifications/templates/${encodeURIComponent(id)}`
  )
}

export function listNotificationSenders() {
  return getCanonical<{ items: NotificationSender[] }>(
    "/api/notifications/senders"
  ).then((res) => res.items)
}

export function upsertNotificationSender(
  body: Partial<NotificationSender> & { password?: string }
) {
  return postCanonical<NotificationSender>("/api/notifications/senders", body)
}
