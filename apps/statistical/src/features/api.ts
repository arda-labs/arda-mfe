import {
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
  submitSubmission: (id: string) =>
    postCanonical<ReportSubmission>(`/api/statistical/submissions/${encodeURIComponent(id)}/submit`, {}),
}
