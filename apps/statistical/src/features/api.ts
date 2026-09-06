import { getCanonicalList, postCanonical } from "@workspace/api"

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
}

export interface Indicator {
  id: string
  tenant_id: string
  code: string
  name: string
  unit?: string
  group_code?: string
  is_active: boolean
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

export const statisticalApi = {
  listReportDefinitions: () =>
    getCanonicalList<ReportDefinition>("/api/statistical/report-definitions"),
  listIndicators: () =>
    getCanonicalList<Indicator>("/api/statistical/indicators"),
  listSubmissions: (params: { report_code?: string; period_code?: string; status?: string } = {}) => {
    const search = new URLSearchParams()
    if (params.report_code) search.set("report_code", params.report_code)
    if (params.period_code) search.set("period_code", params.period_code)
    if (params.status) search.set("status", params.status)
    const qs = search.toString()
    return getCanonicalList<ReportSubmission>(`/api/statistical/submissions${qs ? `?${qs}` : ""}`)
  },
  createSubmission: (body: { report_code: string; period_code: string; payload?: Record<string, unknown> }) =>
    postCanonical<ReportSubmission>("/api/statistical/submissions", body),
  submitSubmission: (id: string) =>
    postCanonical<ReportSubmission>(`/api/statistical/submissions/${encodeURIComponent(id)}/submit`, {}),
}
