import type {
  ReportDefinition,
  Indicator,
  ReportSubmission,
  ReportRunResult,
  ScoreResult,
  ScoreResultInput,
  ImportTransaction,
  CmmsResult,
  CatalogItem,
  FormTemplate,
  DashboardSummary,
  IndicatorUpsertInput,
  ReportDefinitionUpsertInput,
} from "./types"
import { buildListSearchParams } from "@workspace/api/list"
import {
  deleteCanonical,
  getCanonical,
  getCanonicalList,
  postCanonical,
} from "@workspace/api"

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
    order:
      params.order === "asc" || params.order === "desc"
        ? params.order
        : undefined,
    ...(params.page !== undefined ? { page: params.page } : {}),
    ...(params.perPage !== undefined ? { perPage: params.perPage } : {}),
  })
  const qs = search.toString()
  return qs ? `?${qs}` : ""
}

export const statisticalApi = {
  listReportDefinitions: (
    params: {
      q?: string
      sort?: string
      order?: string
      page?: number
      perPage?: number
    } = {}
  ) =>
    getCanonicalList<ReportDefinition>(
      `/api/statistical/report-definitions${listQuery(params)}`
    ),
  upsertReportDefinition: (body: ReportDefinitionUpsertInput) =>
    postCanonical<ReportDefinition>(
      "/api/statistical/report-definitions",
      body
    ),
  listIndicators: (
    params: {
      q?: string
      sort?: string
      order?: string
      page?: number
      perPage?: number
    } = {}
  ) =>
    getCanonicalList<Indicator>(
      `/api/statistical/indicators${listQuery(params)}`
    ),
  upsertIndicator: (body: IndicatorUpsertInput) =>
    postCanonical<Indicator>("/api/statistical/indicators", body),
  listSubmissions: (
    params: {
      report_code?: string
      period_code?: string
      status?: string
      page?: number
      perPage?: number
      sort?: string
      order?: string
    } = {}
  ) => {
    const search = new URLSearchParams()
    if (params.report_code) search.set("report_code", params.report_code)
    if (params.period_code) search.set("period_code", params.period_code)
    if (params.status) search.set("status", params.status)
    if (params.page !== undefined) search.set("page", String(params.page))
    if (params.perPage !== undefined)
      search.set("per_page", String(params.perPage))
    if (params.sort) search.set("sort", params.sort)
    if (params.order) search.set("order", params.order)
    const qs = search.toString()
    return getCanonicalList<ReportSubmission>(
      `/api/statistical/submissions${qs ? `?${qs}` : ""}`
    )
  },
  createSubmission: (body: {
    report_code: string
    period_code: string
    payload?: Record<string, unknown>
  }) => postCanonical<ReportSubmission>("/api/statistical/submissions", body),
  runReport: (
    code: string,
    params: { period_code: string; org_code?: string }
  ) => {
    const search = new URLSearchParams({ period_code: params.period_code })
    if (params.org_code) search.set("org_code", params.org_code)
    return getCanonical<ReportRunResult>(
      `/api/statistical/reports/${encodeURIComponent(code)}/run?${search.toString()}`
    )
  },
  reportExportUrl: (
    code: string,
    params: { period_code: string; org_code?: string }
  ) => {
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
    postCanonical<CatalogItem>(
      `/api/statistical/catalogs/${encodeURIComponent(kind)}`,
      body
    ),
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
  listScoreResults: async (
    params: { scoring_type_code?: string; subject_ref?: string } = {}
  ) => {
    const search = new URLSearchParams()
    if (params.scoring_type_code)
      search.set("scoring_type_code", params.scoring_type_code)
    if (params.subject_ref) search.set("subject_ref", params.subject_ref)
    const qs = search.toString()
    const res = await getCanonicalList<ScoreResult>(
      `/api/statistical/score-results${qs ? `?${qs}` : ""}`
    )
    return res.items ?? []
  },
  createScoreResult: (body: ScoreResultInput) =>
    postCanonical<ScoreResult>("/api/statistical/score-results", body),
  listImportTransactions: (
    params: {
      import_type_code?: string
      period_code?: string
      status?: string
    } = {}
  ) => {
    const search = new URLSearchParams()
    if (params.import_type_code)
      search.set("import_type_code", params.import_type_code)
    if (params.period_code) search.set("period_code", params.period_code)
    if (params.status) search.set("status", params.status)
    const qs = search.toString()
    return getCanonicalList<ImportTransaction>(
      `/api/statistical/import-transactions${qs ? `?${qs}` : ""}`
    ).then((res) => res.items ?? [])
  },
  upsertImportTransaction: (body: Partial<ImportTransaction>) =>
    postCanonical<ImportTransaction>(
      "/api/statistical/import-transactions",
      body
    ),
  submitImportTransaction: (id: string) =>
    postCanonical<ImportTransaction>(
      `/api/statistical/import-transactions/${encodeURIComponent(id)}/submit`,
      {}
    ),
  listCmmsResults: async (
    params: {
      scenario_code?: string
      compliance_period?: string
      status?: string
    } = {}
  ) => {
    const search = new URLSearchParams()
    if (params.scenario_code) search.set("scenario_code", params.scenario_code)
    if (params.compliance_period)
      search.set("compliance_period", params.compliance_period)
    if (params.status) search.set("status", params.status)
    const qs = search.toString()
    const res = await getCanonicalList<CmmsResult>(
      `/api/statistical/cmms/results${qs ? `?${qs}` : ""}`
    )
    return res.items ?? []
  },
  runCmms: (body: Partial<CmmsResult>) =>
    postCanonical<CmmsResult>("/api/statistical/cmms/run", body),
  getSubmission: (id: string) =>
    getCanonical<ReportSubmission>(
      `/api/statistical/submissions/${encodeURIComponent(id)}`
    ),
  submitSubmission: (id: string) =>
    postCanonical<ReportSubmission>(
      `/api/statistical/submissions/${encodeURIComponent(id)}/submit`,
      {}
    ),
}
