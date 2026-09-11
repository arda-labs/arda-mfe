import {
  deleteCanonical,
  getCanonical,
  getCanonicalList,
  postCanonical,
} from "@workspace/api"
import { buildListSearchParams } from "@workspace/api/list"

export interface ReportDefinition {
  id: string
  tenant_id: string
  code: string
  name: string
  group_code?: string
  query_id: string
  param_schema: Record<string, unknown>
  template_file_id?: string
  output_format: string
  is_active: boolean
  created_at?: string
}

export interface Indicator {
  id: string
  tenant_id: string
  code: string
  name: string
  unit?: string
  group_code?: string
  is_active: boolean
  created_at?: string
}

export interface ReportSubmission {
  id: string
  tenant_id: string
  report_code: string
  period_code: string
  status: string
  payload: Record<string, unknown>
  workflow_case_id?: string
  submitted_by?: string
  submitted_at?: string
  created_by: string
  created_at?: string
}

/** Rendered report result returned by the run endpoint. */
export interface ReportRunResult {
  code: string
  name: string
  query_id: string
  columns: string[]
  rows: unknown[][]
  row_count: number
  period_code: string
}

/** QCMS rank-score result (fe_statistical #19). */
export interface ScoreEntry {
  indicator_code: string
  value: number
  max_value: number
  weight: number
}

export interface ScoreBand {
  rank_code: string
  min_score: number
}

export interface ScoreResult {
  id: string
  tenant_id: string
  scoring_type_code: string
  subject_type: string
  subject_ref: string
  total_score: number
  max_score: number
  rank_code: string
  indicators: ScoreEntry[]
  created_by: string
  created_at: string
}

export interface ScoreResultInput {
  scoring_type_code: string
  subject_type?: string
  subject_ref?: string
  entries: ScoreEntry[]
  bands: ScoreBand[]
}

/** QCMS generic catalog row (W5) — kind selects the EPAS catalog screen. */
export interface CatalogItem {
  id: string
  tenant_id: string
  kind: string
  code: string
  name: string
  parent_code?: string
  attributes: Record<string, unknown>
  is_active: boolean
  created_at?: string
}

/** QCMS form template (W5b). */
export interface FormTemplate {
  id: string
  tenant_id: string
  code: string
  name: string
  media_file_id?: string
  schema: Record<string, unknown>
  workflow_case_type?: string
  is_active: boolean
  created_at?: string
}

/** QCMS dashboard summary (W5c). */
export interface DashboardSummary {
  submissions_by_status: Record<string, number>
  catalog_by_kind: Record<string, number>
  report_definitions: number
  indicators: number
  form_templates: number
}

export type IndicatorUpsertInput = {
  code: string
  name: string
  unit?: string
  group_code?: string
}

export type ReportDefinitionUpsertInput = {
  code: string
  name: string
  group_code?: string
  query_id: string
  param_schema?: Record<string, unknown>
  output_format?: string
}

/** Builds `?q&sort&order&page&per_page` for the catalog list endpoints. */
function listQuery(params: {
  q?: string
  sort?: string
  order?: string
  page?: number
  perPage?: number
}): string {
  const search = buildListSearchParams({
    q: params.q,
    sort: params.sort,
    order: params.order === "asc" || params.order === "desc" ? params.order : undefined,
    ...(params.page !== undefined ? { page: params.page } : {}),
    ...(params.perPage !== undefined ? { perPage: params.perPage } : {}),
  })
  const qs = search.toString()
  return qs ? `?${qs}` : ""
}

export const statisticalApi = {
  listReportDefinitions: (params: {
    q?: string
    sort?: string
    order?: string
    page?: number
    perPage?: number
  } = {}) =>
    getCanonicalList<ReportDefinition>(`/api/statistical/report-definitions${listQuery(params)}`),
  upsertReportDefinition: (body: ReportDefinitionUpsertInput) =>
    postCanonical<ReportDefinition>("/api/statistical/report-definitions", body),
  listIndicators: (params: {
    q?: string
    sort?: string
    order?: string
    page?: number
    perPage?: number
  } = {}) =>
    getCanonicalList<Indicator>(`/api/statistical/indicators${listQuery(params)}`),
  upsertIndicator: (body: IndicatorUpsertInput) =>
    postCanonical<Indicator>("/api/statistical/indicators", body),
  listSubmissions: (params: {
    report_code?: string
    period_code?: string
    status?: string
    page?: number
    perPage?: number
    sort?: string
    order?: string
  } = {}) => {
    const search = new URLSearchParams()
    if (params.report_code) search.set("report_code", params.report_code)
    if (params.period_code) search.set("period_code", params.period_code)
    if (params.status) search.set("status", params.status)
    if (params.page !== undefined) search.set("page", String(params.page))
    if (params.perPage !== undefined) search.set("per_page", String(params.perPage))
    if (params.sort) search.set("sort", params.sort)
    if (params.order) search.set("order", params.order)
    const qs = search.toString()
    return getCanonicalList<ReportSubmission>(`/api/statistical/submissions${qs ? `?${qs}` : ""}`)
  },
  createSubmission: (body: { report_code: string; period_code: string; payload?: Record<string, unknown> }) =>
    postCanonical<ReportSubmission>("/api/statistical/submissions", body),
  runReport: (code: string, params: { period_code: string; org_code?: string }) => {
    const search = new URLSearchParams({ period_code: params.period_code })
    if (params.org_code) search.set("org_code", params.org_code)
    return getCanonical<ReportRunResult>(
      `/api/statistical/reports/${encodeURIComponent(code)}/run?${search.toString()}`
    )
  },
  reportExportUrl: (code: string, params: { period_code: string; org_code?: string }) => {
    const search = new URLSearchParams({ period_code: params.period_code })
    if (params.org_code) search.set("org_code", params.org_code)
    return `/api/statistical/reports/${encodeURIComponent(code)}/export?${search.toString()}`
  },
  listCatalogKinds: () => getCanonicalList<string>("/api/statistical/catalogs"),
  listCatalogItems: (kind: string, includeInactive = false) =>
    getCanonicalList<CatalogItem>(
      `/api/statistical/catalogs/${encodeURIComponent(kind)}${includeInactive ? "?include_inactive=true" : ""}`
    ),
  upsertCatalogItem: (kind: string, body: Partial<CatalogItem>) =>
    postCanonical<CatalogItem>(`/api/statistical/catalogs/${encodeURIComponent(kind)}`, body),
  deactivateCatalogItem: (kind: string, id: string) =>
    deleteCanonical<{ ok: boolean }>(
      `/api/statistical/catalogs/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`
    ),
  listFormTemplates: (includeInactive = false) =>
    getCanonicalList<FormTemplate>(
      `/api/statistical/form-templates${includeInactive ? "?include_inactive=true" : ""}`
    ),
  upsertFormTemplate: (body: Partial<FormTemplate>) =>
    postCanonical<FormTemplate>("/api/statistical/form-templates", body),
  formTemplateExportUrl: (code: string) =>
    `/api/statistical/form-templates/${encodeURIComponent(code)}/export`,
  importFormTemplate: (body: unknown) =>
    postCanonical<FormTemplate>("/api/statistical/form-templates/import", body),
  getDashboard: () =>
    getCanonical<DashboardSummary>("/api/statistical/dashboard"),
  listScoreResults: async (params: { scoring_type_code?: string; subject_ref?: string } = {}) => {
    const search = new URLSearchParams()
    if (params.scoring_type_code) search.set("scoring_type_code", params.scoring_type_code)
    if (params.subject_ref) search.set("subject_ref", params.subject_ref)
    const qs = search.toString()
    const res = await getCanonicalList<ScoreResult>(
      `/api/statistical/score-results${qs ? `?${qs}` : ""}`
    )
    return res.items ?? []
  },
  createScoreResult: (body: ScoreResultInput) =>
    postCanonical<ScoreResult>("/api/statistical/score-results", body),
  submitSubmission: (id: string) =>
    postCanonical<ReportSubmission>(`/api/statistical/submissions/${encodeURIComponent(id)}/submit`, {}),
}
