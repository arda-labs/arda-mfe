import {
  deleteCanonical,
  getCanonical,
  getCanonicalList,
  postCanonical,
  putCanonical,
} from "@workspace/api"
import type { ApiRequestOptions } from "@workspace/api/client"
import { buildListSearchParams } from "@workspace/api/list"
import type { Organization, OrganizationsListParams } from "./types"

/** Pure query builder — unit-tested in apps/platform/tests/feature-api.test.ts. */
export function organizationListSearch(params: OrganizationsListParams = {}) {
  return buildListSearchParams({
    page: params.page ?? 1,
    perPage: params.perPage ?? 20,
    sort: params.sort,
    order: params.order,
    q: params.q,
    view: params.view,
    all: params.all,
    is_active: params.is_active,
  })
}

export const organizationsApi = {
  listOrganizations: (
    params: OrganizationsListParams = {},
    requestOptions?: ApiRequestOptions
  ) => {
    const search = organizationListSearch(params)
    return getCanonicalList<Organization>(
      `/api/platform/organizations?${search.toString()}`,
      requestOptions
    )
  },
  getOrganization: (id: string) => {
    return getCanonical<Organization>(`/api/platform/organizations/${id}`)
  },
  createOrganization: (data: Partial<Organization>) => {
    return postCanonical<Organization>("/api/platform/organizations", data)
  },
  updateOrganization: (id: string, data: Partial<Organization>) => {
    return putCanonical<Organization>(`/api/platform/organizations/${id}`, data)
  },
  deleteOrganization: (id: string) => {
    return deleteCanonical<{ ok: boolean }>(`/api/platform/organizations/${id}`)
  },
}
