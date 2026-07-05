import { api } from "@workspace/api"
import type { ListResponse } from "@workspace/core/http/list-api"

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
  const q = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) q.set(key, value)
  })
  const query = q.toString()
  return query ? `${path}?${query}` : path
}

export const hrmApi = {
  listPositions: () => api.get<Position[]>("/api/hrm/positions"),
  createPosition: (payload: Partial<Position>) =>
    api.post<Position>("/api/hrm/positions", payload),
  updatePosition: (id: string, payload: Partial<Position>) =>
    api.put<Position>(`/api/hrm/positions/${id}`, payload),
  deletePosition: (id: string) =>
    api.delete<{ ok: boolean }>(`/api/hrm/positions/${id}`),

  listJobTitles: () => api.get<JobTitle[]>("/api/hrm/job-titles"),
  createJobTitle: (payload: Partial<JobTitle>) =>
    api.post<JobTitle>("/api/hrm/job-titles", payload),
  updateJobTitle: (id: string, payload: Partial<JobTitle>) =>
    api.put<JobTitle>(`/api/hrm/job-titles/${id}`, payload),
  deleteJobTitle: (id: string) =>
    api.delete<{ ok: boolean }>(`/api/hrm/job-titles/${id}`),

  listOrgUnits: (organizationId?: string) =>
    api.get<OrgUnit[]>(
      withParams("/api/hrm/org-units", { organization_id: organizationId })
    ),
  createOrgUnit: (payload: Partial<OrgUnit>) =>
    api.post<OrgUnit>("/api/hrm/org-units", payload),
  updateOrgUnit: (id: string, payload: Partial<OrgUnit>) =>
    api.put<OrgUnit>(`/api/hrm/org-units/${id}`, payload),
  deleteOrgUnit: (id: string) =>
    api.delete<{ ok: boolean }>(`/api/hrm/org-units/${id}`),

  listEmployees: () => api.get<Employee[]>("/api/hrm/employees"),
  listEmployeeRegistrations: () =>
    api.get<EmployeeRegistration[]>("/api/hrm/employee-registrations"),
  createEmployeeRegistration: (payload: {
    registration_code?: string
    payload: Record<string, unknown>
  }) => api.post<EmployeeRegistration>("/api/hrm/employee-registrations", payload),
  updateEmployeeRegistration: (id: string, payload: Record<string, unknown>) =>
    api.put<EmployeeRegistration>(`/api/hrm/employee-registrations/${id}`, {
      payload,
    }),
  submitEmployeeRegistration: (id: string) =>
    api.post<EmployeeRegistration>(`/api/hrm/employee-registrations/${id}/submit`),

  listOrganizations: () =>
    api.get<ListResponse<PlatformOrganization>>(
      "/api/platform/organizations?all=1&is_active=true"
    ),
}
