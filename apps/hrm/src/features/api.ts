import {
  deleteCanonical,
  getCanonical,
  getCanonicalList,
  postCanonical,
  putCanonical,
} from "@workspace/api"
import { buildSearchParams, type SearchParams } from "@workspace/api/query"

export type Status = "active" | "inactive"

/** Server list contract forwarded to hrm-service (ardahttp.ParseListQuery). */
export interface HrmListParams {
  q?: string
  status?: string
  sort?: string
  order?: "asc" | "desc"
  page?: number
  perPage?: number
}

export interface Position {
  id: string
  code: string
  name: string
  status: Status
  is_manager: boolean
  description?: string
  created_at?: string
  updated_at?: string
}

export interface JobTitle {
  id: string
  code: string
  name: string
  description?: string
  created_at?: string
  updated_at?: string
}

export interface PlatformOrganization {
  id: string
  code: string
  name: string
}

export interface OrgUnit {
  id: string
  code: string
  organization_id: string
  name: string
  org_level: string
  parent_id?: string
  department_type: string
  status: Status
  description?: string
  created_at?: string
  updated_at?: string
}

export interface Employee {
  id: string
  employee_code: string
  full_name: string
  org_unit_id?: string
  position_id?: string
  job_title_id?: string
  iam_user_id?: string
  status: Status
  created_at?: string
  updated_at?: string
}

export interface EmployeeRegistration {
  id: string
  registration_code: string
  payload: string | Record<string, unknown>
  workflow_case_id?: string
  status: "draft" | "submitted" | "approved" | "rejected"
  created_by?: string
  /** Row version the checker saw — sent back as `dataVersion` on approve. */
  data_version?: number
}

function withParams(path: string, params: SearchParams = {}) {
  const q = buildSearchParams(params)
  const query = q.toString()
  return query ? `${path}?${query}` : path
}

/** URL query for a paged hrm list (maps HrmListParams to snake_case params). */
function listQueryParams(params: HrmListParams) {
  return {
    q: params.q,
    status: params.status,
    sort: params.sort,
    order: params.order,
    page: params.page,
    per_page: params.perPage,
  }
}

/**
 * hrm-service stores statuses UPPERCASE (workflow contract) while the view
 * model/forms use lowercase. Normalize at the API boundary so every screen and
 * form comparison keeps working — filters are case-normalized server-side.
 */
function normalizeStatus<T extends { status?: string }>(item: T): T {
  if (typeof item?.status !== "string") return item
  return { ...item, status: item.status.toLowerCase() } as T
}

async function normalizeStatusPage<
  T extends { status?: string },
  P extends { items: T[] },
>(page: Promise<P>): Promise<P> {
  const resolved = await page
  return { ...resolved, items: resolved.items.map(normalizeStatus) }
}

export const hrmApi = {
  // Full-table lookups (all=1) for dropdowns/name maps — small catalogs.
  listPositions: async () =>
    (await getCanonicalList<Position>("/api/hrm/positions?all=1")).items.map(
      normalizeStatus
    ),
  /** URL-synced server list contract for the positions catalog page. */
  listPositionsPaged: (params: HrmListParams = {}) =>
    normalizeStatusPage(
      getCanonicalList<Position>(
        withParams("/api/hrm/positions", listQueryParams(params))
      )
    ),
  createPosition: (payload: Partial<Position>) =>
    postCanonical<Position>("/api/hrm/positions", payload).then(normalizeStatus),
  updatePosition: (id: string, payload: Partial<Position>) =>
    putCanonical<Position>(`/api/hrm/positions/${id}`, payload).then(
      normalizeStatus
    ),
  deletePosition: (id: string) =>
    deleteCanonical<{ ok: boolean }>(`/api/hrm/positions/${id}`),

  listJobTitles: async () =>
    (await getCanonicalList<JobTitle>("/api/hrm/job-titles?all=1")).items,
  /** URL-synced server list contract for the job-titles catalog page. */
  listJobTitlesPaged: (params: HrmListParams = {}) =>
    getCanonicalList<JobTitle>(
      withParams("/api/hrm/job-titles", listQueryParams(params))
    ),
  createJobTitle: (payload: Partial<JobTitle>) =>
    postCanonical<JobTitle>("/api/hrm/job-titles", payload),
  updateJobTitle: (id: string, payload: Partial<JobTitle>) =>
    putCanonical<JobTitle>(`/api/hrm/job-titles/${id}`, payload),
  deleteJobTitle: (id: string) =>
    deleteCanonical<{ ok: boolean }>(`/api/hrm/job-titles/${id}`),

  listOrgUnits: async (organizationId?: string) =>
    (
      await getCanonicalList<OrgUnit>(
        withParams("/api/hrm/org-units", {
          organization_id: organizationId,
          all: "1",
        })
      )
    ).items.map(normalizeStatus),
  /** URL-synced server list contract for the org-units catalog page. */
  listOrgUnitsPaged: (params: HrmListParams = {}) =>
    normalizeStatusPage(
      getCanonicalList<OrgUnit>(
        withParams("/api/hrm/org-units", listQueryParams(params))
      )
    ),
  createOrgUnit: (payload: Partial<OrgUnit>) =>
    postCanonical<OrgUnit>("/api/hrm/org-units", payload).then(normalizeStatus),
  updateOrgUnit: (id: string, payload: Partial<OrgUnit>) =>
    putCanonical<OrgUnit>(`/api/hrm/org-units/${id}`, payload).then(
      normalizeStatus
    ),
  deleteOrgUnit: (id: string) =>
    deleteCanonical<{ ok: boolean }>(`/api/hrm/org-units/${id}`),

  /**
   * URL-synced server list contract for the employees catalog page. The
   * legacy lookup signature (all=1 full fetch) was only used by the old
   * read-only page and is superseded by the paged contract.
   */
  listEmployees: (params: HrmListParams = {}) =>
    normalizeStatusPage(
      getCanonicalList<Employee>(
        withParams("/api/hrm/employees", listQueryParams(params))
      )
    ),
  createEmployee: (payload: Partial<Employee>) =>
    postCanonical<Employee>("/api/hrm/employees", payload).then(normalizeStatus),
  updateEmployee: (id: string, payload: Partial<Employee>) =>
    putCanonical<Employee>(`/api/hrm/employees/${id}`, payload).then(
      normalizeStatus
    ),
  deleteEmployee: (id: string) =>
    deleteCanonical<{ ok: boolean }>(`/api/hrm/employees/${id}`),

  listRegistrations: async (status?: string) =>
    (
      await getCanonicalList<EmployeeRegistration>(
        withParams("/api/hrm/registrations", { status, all: "1" })
      )
    ).items.map(normalizeStatus),
  getEmployeeRegistration: (id: string) =>
    getCanonical<EmployeeRegistration>(
      `/api/hrm/employee-registrations/${encodeURIComponent(id)}`
    ).then(normalizeStatus),
  createRegistration: (payload: Partial<EmployeeRegistration>) =>
    postCanonical<EmployeeRegistration>(
      "/api/hrm/registrations",
      payload
    ).then(normalizeStatus),
  createEmployeeRegistration: (payload: Record<string, unknown>) =>
    postCanonical<EmployeeRegistration>(
      "/api/hrm/registrations",
      payload
    ).then(normalizeStatus),
  updateEmployeeRegistration: (
    id: string,
    payload: Record<string, unknown>
  ) =>
    putCanonical<EmployeeRegistration>(
      `/api/hrm/registrations/${id}`,
      payload
    ).then(normalizeStatus),
  submitRegistration: (id: string) =>
    postCanonical<EmployeeRegistration>(
      `/api/hrm/registrations/${id}/submit`,
      {}
    ).then(normalizeStatus),
  submitEmployeeRegistration: (id: string) =>
    postCanonical<EmployeeRegistration>(
      `/api/hrm/registrations/${id}/submit`,
      {}
    ).then(normalizeStatus),
  cancelRegistration: (id: string) =>
    postCanonical<EmployeeRegistration>(
      `/api/hrm/registrations/${id}/cancel`,
      {}
    ).then(normalizeStatus),
  approveRegistration: (id: string) =>
    postCanonical<EmployeeRegistration>(
      `/api/hrm/registrations/${id}/approve`,
      {}
    ).then(normalizeStatus),
  rejectRegistration: (id: string, reason?: string) =>
    postCanonical<EmployeeRegistration>(
      `/api/hrm/registrations/${id}/reject`,
      { reason }
    ).then(normalizeStatus),

  listPlatformOrganizations: async () =>
    (
      await getCanonicalList<PlatformOrganization>(
        "/api/platform/organizations?all=1"
      )
    ).items,
  listOrganizations: () =>
    getCanonicalList<PlatformOrganization>(
      "/api/platform/organizations?all=1"
    ),
}
