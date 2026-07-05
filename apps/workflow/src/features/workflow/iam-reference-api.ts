import {
  buildListSearchParams,
  listPageCount,
  type ListResponse,
} from "@workspace/core/http/list-api"

export type IamPrincipalUser = {
  id: string
  username: string
  email: string
  name: string
  status: string
}

export type IamPrincipalGroup = {
  id: string
  code: string
  name: string
  status: string
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: "include" })
  if (!response.ok) {
    const message = await response.text().catch(() => "")
    throw new Error(message || `Request failed with status ${response.status}`)
  }
  return (await response.json()) as T
}

export function listIamUsers(params: {
  page: number
  perPage: number
  q?: string
}) {
  const query = buildListSearchParams({
    page: params.page,
    perPage: params.perPage,
    q: params.q,
  })
  return fetchJson<ListResponse<IamPrincipalUser>>(
    `/api/admin/users?${query.toString()}`
  ).then((res) => ({
    ...res,
    totalPages: listPageCount(res.total, res.per_page),
  }))
}

export function listIamGroups(params: {
  page: number
  perPage: number
  q?: string
}) {
  const query = buildListSearchParams({
    page: params.page,
    perPage: params.perPage,
    q: params.q,
  })
  return fetchJson<ListResponse<IamPrincipalGroup>>(
    `/api/admin/groups?${query.toString()}`
  ).then((res) => ({
    ...res,
    totalPages: listPageCount(res.total, res.per_page),
  }))
}
