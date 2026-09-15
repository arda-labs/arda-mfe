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

/** QCMS staged import transaction (fe_statistical #20). */
export interface ImportTransaction {
  id: string
  tenant_id: string
  import_type_code: string
  period_code: string
  status: string
  row_count: number
  payload: Record<string, unknown>
  created_by: string
  created_at: string
  updated_at: string
}

/** CMMS compliance run result (fe_statistical #21). */
export interface CmmsResult {
  id: string
  tenant_id: string
  scenario_code: string
  compliance_period: string
  status: string
  checked_count: number
  failed_count: number
  details: Record<string, unknown>
  run_by: string
  run_at: string
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
