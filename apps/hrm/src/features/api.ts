import {
  deleteCanonical,
  getCanonicalList,
  postCanonical,
  putCanonical,
} from "@workspace/api"
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
  payload: string | Record<string, unknown>
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
    (await getCanonicalList<Position>("/api/hrm/positions?all=1")).items,
  createPosition: (payload: Partial<Position>) =>
    postCanonical<Position>("/api/hrm/positions", payload),
  updatePosition: (id: string, payload: Partial<Position>) =>
    putCanonical<Position>(`/api/hrm/positions/${id}`, payload),
  deletePosition: (id: string) =>
    deleteCanonical<{ ok: boolean }>(`/api/hrm/positions/${id}`),

  listJobTitles: async () =>
    (await getCanonicalList<JobTitle>("/api/hrm/job-titles?all=1")).items,
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
    ).items,
  createOrgUnit: (payload: Partial<OrgUnit>) =>
    postCanonical<OrgUnit>("/api/hrm/org-units", payload),
  updateOrgUnit: (id: string, payload: Partial<OrgUnit>) =>
    putCanonical<OrgUnit>(`/api/hrm/org-units/${id}`, payload),
  deleteOrgUnit: (id: string) =>
    deleteCanonical<{ ok: boolean }>(`/api/hrm/org-units/${id}`),

  listEmployees: async (params?: {
    organizationId?: string
    orgUnitId?: string
    positionId?: string
    status?: string
    search?: string
  }) =>
    (
      await getCanonicalList<Employee>(
        withParams("/api/hrm/employees", {
          organization_id: params?.organizationId,
          org_unit_id: params?.orgUnitId,
          position_id: params?.positionId,
          status: params?.status,
          q: params?.search,
          all: "1",
        })
      )
    ).items,
  createEmployee: (payload: Partial<Employee>) =>
    postCanonical<Employee>("/api/hrm/employees", payload),
  updateEmployee: (id: string, payload: Partial<Employee>) =>
    putCanonical<Employee>(`/api/hrm/employees/${id}`, payload),
  deleteEmployee: (id: string) =>
    deleteCanonical<{ ok: boolean }>(`/api/hrm/employees/${id}`),

  listRegistrations: async (status?: string) =>
    (
      await getCanonicalList<EmployeeRegistration>(
        withParams("/api/hrm/registrations", { status, all: "1" })
      )
    ).items,
  createRegistration: (payload: Partial<EmployeeRegistration>) =>
    postCanonical<EmployeeRegistration>("/api/hrm/registrations", payload),
  createEmployeeRegistration: (payload: Record<string, unknown>) =>
    postCanonical<EmployeeRegistration>("/api/hrm/registrations", payload),
  updateEmployeeRegistration: (
    id: string,
    payload: Record<string, unknown>
  ) =>
    putCanonical<EmployeeRegistration>(`/api/hrm/registrations/${id}`, payload),
  submitRegistration: (id: string) =>
    postCanonical<EmployeeRegistration>(
      `/api/hrm/registrations/${id}/submit`,
      {}
    ),
  submitEmployeeRegistration: (id: string) =>
    postCanonical<EmployeeRegistration>(
      `/api/hrm/registrations/${id}/submit`,
      {}
    ),
  cancelRegistration: (id: string) =>
    postCanonical<EmployeeRegistration>(
      `/api/hrm/registrations/${id}/cancel`,
      {}
    ),
  approveRegistration: (id: string) =>
    postCanonical<EmployeeRegistration>(
      `/api/hrm/registrations/${id}/approve`,
      {}
    ),
  rejectRegistration: (id: string, reason?: string) =>
    postCanonical<EmployeeRegistration>(
      `/api/hrm/registrations/${id}/reject`,
      { reason }
    ),

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
