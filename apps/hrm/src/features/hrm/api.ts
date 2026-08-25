import { api, type ApiSuccess } from "@workspace/api"
import type { ListResponse } from "@workspace/api/list"
import { buildSearchParams } from "@workspace/api/query"

export type Status = "active" | "inactive"

export interface Position {
  id: string
  code: string
  name: string
  status: Status
  is_manager: boolean
  description?: string
}

export interface JobTitle {
  id: string
  code: string
  name: string
  description?: string
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
}

export interface EmployeeRegistration {
  id: string
  registration_code: string
  payload: string
  workflow_case_id?: string
  status: "draft" | "submitted" | "approved" | "rejected"
  created_by?: string
}

function withParams(path: string, params: Record<string, string | undefined>) {
  const q = buildSearchParams(params)
  const query = q.toString()
  return query ? `${path}?${query}` : path
}

export const hrmApi = {
  listPositions: async () =>
    (
      await api.get<ApiSuccess<ListResponse<Position>>>(
        "/api/hrm/positions?all=1"
      )
    ).result.items,
  createPosition: (payload: Partial<Position>) =>
    api
      .post<ApiSuccess<Position>>("/api/hrm/positions", payload)
      .then((res) => res.result),
  updatePosition: (id: string, payload: Partial<Position>) =>
    api
      .put<ApiSuccess<Position>>(`/api/hrm/positions/${id}`, payload)
      .then((res) => res.result),
  deletePosition: (id: string) =>
    api
      .delete<ApiSuccess<{ ok: boolean }>>(`/api/hrm/positions/${id}`)
      .then((res) => res.result),

  listJobTitles: async () =>
    (
      await api.get<ApiSuccess<ListResponse<JobTitle>>>(
        "/api/hrm/job-titles?all=1"
      )
    ).result.items,
  createJobTitle: (payload: Partial<JobTitle>) =>
    api
      .post<ApiSuccess<JobTitle>>("/api/hrm/job-titles", payload)
      .then((res) => res.result),
  updateJobTitle: (id: string, payload: Partial<JobTitle>) =>
    api
      .put<ApiSuccess<JobTitle>>(`/api/hrm/job-titles/${id}`, payload)
      .then((res) => res.result),
  deleteJobTitle: (id: string) =>
    api
      .delete<ApiSuccess<{ ok: boolean }>>(`/api/hrm/job-titles/${id}`)
      .then((res) => res.result),

  listOrgUnits: async (organizationId?: string) =>
    (
      await api.get<ApiSuccess<ListResponse<OrgUnit>>>(
        withParams("/api/hrm/org-units", {
          organization_id: organizationId,
          all: "1",
        })
      )
    ).result.items,
  createOrgUnit: (payload: Partial<OrgUnit>) =>
    api
      .post<ApiSuccess<OrgUnit>>("/api/hrm/org-units", payload)
      .then((res) => res.result),
  updateOrgUnit: (id: string, payload: Partial<OrgUnit>) =>
    api
      .put<ApiSuccess<OrgUnit>>(`/api/hrm/org-units/${id}`, payload)
      .then((res) => res.result),
  deleteOrgUnit: (id: string) =>
    api
      .delete<ApiSuccess<{ ok: boolean }>>(`/api/hrm/org-units/${id}`)
      .then((res) => res.result),

  listEmployees: async () =>
    (
      await api.get<ApiSuccess<ListResponse<Employee>>>(
        "/api/hrm/employees?all=1"
      )
    ).result.items,
  listEmployeeRegistrations: async () =>
    (
      await api.get<ApiSuccess<ListResponse<EmployeeRegistration>>>(
        "/api/hrm/employee-registrations?all=1"
      )
    ).result.items,
  createEmployeeRegistration: (payload: {
    registration_code?: string
    payload: Record<string, unknown>
  }) =>
    api
      .post<ApiSuccess<EmployeeRegistration>>(
        "/api/hrm/employee-registrations",
        payload
      )
      .then((res) => res.result),
  updateEmployeeRegistration: (id: string, payload: Record<string, unknown>) =>
    api
      .put<ApiSuccess<EmployeeRegistration>>(
        `/api/hrm/employee-registrations/${id}`,
        { payload }
      )
      .then((res) => res.result),
  submitEmployeeRegistration: (id: string) =>
    api
      .post<ApiSuccess<EmployeeRegistration>>(
        `/api/hrm/employee-registrations/${id}/submit`
      )
      .then((res) => res.result),

  listOrganizations: () =>
    api
      .get<ApiSuccess<ListResponse<PlatformOrganization>>>(
        "/api/platform/organizations?all=1&is_active=true"
      )
      .then((res) => res.result),
}
