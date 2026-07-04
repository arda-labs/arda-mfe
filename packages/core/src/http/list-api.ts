export type ListResponse<T> = {
  items: T[]
  page: number
  per_page: number
  total: number
}

export type ListQueryInput = {
  page?: number
  perPage?: number
  sort?: string
  order?: "asc" | "desc"
  q?: string
  view?: "tree" | "options"
  all?: boolean
  [key: string]: string | number | boolean | undefined
}

const RESERVED_LIST_KEYS = new Set([
  "page",
  "perPage",
  "sort",
  "order",
  "q",
  "view",
  "all",
])

export function buildListSearchParams(params: ListQueryInput = {}): URLSearchParams {
  const search = new URLSearchParams()

  if (params.page !== undefined) {
    search.set("page", String(params.page))
  }
  if (params.perPage !== undefined) {
    search.set("per_page", String(params.perPage))
  }
  if (params.sort) {
    search.set("sort", params.sort)
  }
  if (params.order) {
    search.set("order", params.order)
  }
  if (params.q) {
    search.set("q", params.q)
  }
  if (params.view) {
    search.set("view", params.view)
  }
  if (params.all) {
    search.set("all", "1")
  }

  for (const [key, value] of Object.entries(params)) {
    if (RESERVED_LIST_KEYS.has(key)) continue
    if (value === undefined || value === "") continue
    search.set(key, String(value))
  }

  return search
}

export function listPageCount(total: number, perPage: number): number {
  const size = Math.max(perPage, 1)
  return Math.max(1, Math.ceil(total / size))
}

export function sortToApiParams(
  sorting: { id: string; desc: boolean }[]
): Pick<ListQueryInput, "sort" | "order"> {
  if (sorting.length === 0) return {}
  const [current] = sorting
  if (!current?.id) return {}
  return {
    sort: current.id,
    order: current.desc ? "desc" : "asc",
  }
}

export function createRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID()
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
