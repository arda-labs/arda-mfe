import { buildSearchParams } from "@workspace/api/query"
import {
  deleteCanonical,
  getCanonical,
  getCanonicalList,
  postCanonical,
  putCanonical,
} from "@workspace/api"

/** CRM project + member API (W7). */
export interface CrmProject {
  id: string
  project_code: string
  name: string
  type_code: string
  start_date?: string
  end_date?: string
  status: string
  description?: string
}

export interface CrmProjectMember {
  id: string
  project_id: string
  user_id: string
  role_code?: string
  is_active: boolean
}

export interface CrmProjectDetail {
  project: CrmProject
  members: CrmProjectMember[]
}

export function listCrmProjects(params: { q?: string; status?: string } = {}) {
  const q = buildSearchParams({ q: params.q, status: params.status })
  const suffix = q.size ? `?${q.toString()}` : ""
  return getCanonicalList<CrmProject>(`/api/crm/projects${suffix}`)
}

export function createCrmProject(body: Partial<CrmProject>) {
  return postCanonical<CrmProject>("/api/crm/projects", body)
}

export function getCrmProject(id: string) {
  return getCanonical<CrmProjectDetail>(
    `/api/crm/projects/${encodeURIComponent(id)}`
  )
}

export function updateCrmProject(id: string, body: Partial<CrmProject>) {
  return putCanonical<CrmProject>(
    `/api/crm/projects/${encodeURIComponent(id)}`,
    body
  )
}

export function addCrmProjectMember(
  projectId: string,
  body: { user_id: string; role_code?: string }
) {
  return postCanonical<CrmProjectMember>(
    `/api/crm/projects/${encodeURIComponent(projectId)}/members`,
    body
  )
}

export function removeCrmProjectMember(projectId: string, memberId: string) {
  return deleteCanonical<{ ok: boolean }>(
    `/api/crm/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(memberId)}`
  )
}
