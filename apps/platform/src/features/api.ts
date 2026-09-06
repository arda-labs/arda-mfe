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

// ── MDM (master data service) ──

export interface MdmItem {
  id: string
  tenant_id?: string
  code: string
  name: string
  description?: string
  is_active: boolean
  attributes?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export const mdmCatalogs = [
  { key: "currencies", labelKey: "mdm.catalog.currencies" },
  { key: "countries", labelKey: "mdm.catalog.countries" },
  { key: "id-document-types", labelKey: "mdm.catalog.id_document_types" },
  { key: "collateral-types", labelKey: "mdm.catalog.collateral_types" },
  { key: "loan-purposes", labelKey: "mdm.catalog.loan_purposes" },
  { key: "fee-types", labelKey: "mdm.catalog.fee_types" },
  { key: "debt-groups", labelKey: "mdm.catalog.debt_groups" },
  { key: "economic-types", labelKey: "mdm.catalog.economic_types" },
  { key: "industries", labelKey: "mdm.catalog.industries" },
  { key: "loan-methods", labelKey: "mdm.catalog.loan_methods" },
  { key: "loan-contract-types", labelKey: "mdm.catalog.loan_contract_types" },
  { key: "fund-sources", labelKey: "mdm.catalog.fund_sources" },
  { key: "fund-purposes", labelKey: "mdm.catalog.fund_purposes" },
  { key: "base-rates", labelKey: "mdm.catalog.base_rates" },
  { key: "interest-factors", labelKey: "mdm.catalog.interest_factors" },
  { key: "cash-denominations", labelKey: "mdm.catalog.cash_denominations" },
  { key: "scoring-types", labelKey: "mdm.catalog.scoring_types" },
  {
    key: "scoring-indicator-groups",
    labelKey: "mdm.catalog.scoring_indicator_groups",
  },
  { key: "scoring-indicators", labelKey: "mdm.catalog.scoring_indicators" },
  { key: "scoring-benchmarks", labelKey: "mdm.catalog.scoring_benchmarks" },
] as const

export type MdmCatalogKey = (typeof mdmCatalogs)[number]["key"]

export const mdmApi = {
  listItems: (catalog: MdmCatalogKey, requestOptions?: ApiRequestOptions) =>
    getCanonical<MdmItem[]>(`/api/mdm/${catalog}`, requestOptions),
  createItem: (catalog: MdmCatalogKey, body: Partial<MdmItem>) =>
    postCanonical<MdmItem>(`/api/mdm/${catalog}`, body),
  updateItem: (catalog: MdmCatalogKey, id: string, body: Partial<MdmItem>) =>
    putCanonical<MdmItem>(`/api/mdm/${catalog}/${encodeURIComponent(id)}`, body),
  deleteItem: (catalog: MdmCatalogKey, id: string) =>
    deleteCanonical(`/api/mdm/${catalog}/${encodeURIComponent(id)}`),
}

// ── Loan (credit domain) ──

export interface LoanContract {
  id: string
  tenant_id: string
  contract_code: string
  contract_no?: string
  customer_code: string
  product_code?: string
  contract_type_code?: string
  interest_rate?: number
  loan_amt: number
  loan_term?: number
  term_unit?: string
  maturity_date?: string
  status: string
  workflow_case_id?: string
  created_at?: string
}

export interface LoanAdjustment {
  id: string
  tenant_id: string
  kind: string
  contract_code: string
  agreement_code?: string
  effective_date?: string
  amount?: number
  status: string
  workflow_case_id?: string
  decision_note?: string
  created_at?: string
}

export const loanAdjustmentKinds = [
  { key: "debt-change", labelKey: "loan.kind.debt_change" },
  { key: "rate-change", labelKey: "loan.kind.rate_change" },
  { key: "restructure", labelKey: "loan.kind.restructure" },
  { key: "waiver", labelKey: "loan.kind.waiver" },
  { key: "writeoff", labelKey: "loan.kind.writeoff" },
  { key: "recovery", labelKey: "loan.kind.recovery" },
  { key: "fund-check", labelKey: "loan.kind.fund_check" },
  { key: "revenue-allocation", labelKey: "loan.kind.revenue_allocation" },
  { key: "vfu-fee-allocation", labelKey: "loan.kind.vfu_fee_allocation" },
  { key: "off-balance-export", labelKey: "loan.kind.off_balance_export" },
] as const

export type LoanAdjustmentKind = (typeof loanAdjustmentKinds)[number]["key"]

export const loanApi = {
  listContracts: (params: { q?: string; status?: string } = {}) => {
    const search = buildSearchParams({ q: params.q, status: params.status })
    const qs = search.toString()
    return getCanonical<LoanContract[]>(`/api/loan/contracts${qs ? `?${qs}` : ""}`)
  },
  submitContract: (id: string) =>
    postCanonical<LoanContract>(`/api/loan/contracts/${encodeURIComponent(id)}/submit`, {}),
  listAdjustments: (kind: LoanAdjustmentKind, params: { contract_code?: string; status?: string } = {}) => {
    const search = buildSearchParams({
      contract_code: params.contract_code,
      status: params.status,
    })
    const qs = search.toString()
    return getCanonical<LoanAdjustment[]>(`/api/loan/adjustments/${kind}${qs ? `?${qs}` : ""}`)
  },
  createAdjustment: (kind: LoanAdjustmentKind, body: Partial<LoanAdjustment> & { payload?: Record<string, unknown> }) =>
    postCanonical<LoanAdjustment>(`/api/loan/adjustments/${kind}`, body),
  submitAdjustment: (kind: LoanAdjustmentKind, id: string) =>
    postCanonical<LoanAdjustment>(
      `/api/loan/adjustments/${kind}/${encodeURIComponent(id)}/submit`,
      {}
    ),
}
