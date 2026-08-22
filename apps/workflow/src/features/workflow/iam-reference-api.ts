import {
  buildListSearchParams,
  listPageCount,
  type ListResponse,
} from "@workspace/api/list"
import { api } from "@workspace/api"

export type IamPrincipalUser = {
  id: string
  username: string
  email: string
  name: string
  status: string
}

type IamUserApiItem = Partial<IamPrincipalUser> & {
  // wire uses snake_case for some admin fields; user list keeps id/username/email/name/status
}

function normalizeIamUser(item: IamUserApiItem): IamPrincipalUser {
  return {
    id: item.id ?? "",
    username: item.username ?? "",
    email: item.email ?? "",
    name: item.name ?? "",
    status: item.status ?? "",
  }
}

export type IamPrincipalGroup = {
  id: string
  code: string
  name: string
  status: string
}

async function fetchJson<T>(path: string): Promise<T> {
  return api.get<T>(path)
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
  return fetchJson<ListResponse<IamUserApiItem>>(
    `/api/admin/users?${query.toString()}`
  ).then((res) => ({
    ...res,
    items: res.items.map(normalizeIamUser),
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
