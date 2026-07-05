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

type UsersResponse = {
  users: IamPrincipalUser[]
  total: number
  totalPages?: number
  page: number
  size: number
}

type GroupsResponse = {
  groups: IamPrincipalGroup[]
  total: number
  totalPages?: number
  page: number
  size: number
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
  size: number
  search?: string
}) {
  const query = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
  })
  if (params.search) query.set("search", params.search)
  return fetchJson<UsersResponse>(`/api/admin/users?${query.toString()}`)
}

export function listIamGroups(params: {
  page: number
  size: number
  search?: string
}) {
  const query = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
  })
  if (params.search) query.set("search", params.search)
  return fetchJson<GroupsResponse>(`/api/admin/groups?${query.toString()}`)
}
