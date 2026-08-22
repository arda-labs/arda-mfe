import {
  keepPreviousData,
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query"
import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import {
  serializeListQuery,
  sortToApiParams,
  type ListQueryInput,
  type ListResponse,
} from "@workspace/api/list"

export type ServerListFilterMode = "text" | "single" | "multi"

export type ServerListFilterConfig = {
  urlKey: string
  apiKey?: string
  mode: ServerListFilterMode
  allowedValues?: readonly string[]
}

export type ServerListQueryConfig = {
  defaultPageSize?: number
  sortableColumns?: readonly string[]
  filters?: readonly ServerListFilterConfig[]
  queryKeys?: Partial<{ page: string; perPage: string; sort: string }>
}

export type ServerListFilterValues = Record<
  string,
  string | string[] | number | boolean | null | undefined
>

export type ServerListDefinition = {
  queryKey: QueryKey
  queryConfig: ServerListQueryConfig
}

export function defineServerList<
  const TDefinition extends ServerListDefinition,
>(definition: TDefinition) {
  return definition
}

export type ServerListQueryContext = { signal: AbortSignal }

export type ServerListQueryFn<
  TItem,
  TQuery extends ListQueryInput = ListQueryInput,
> = (
  query: TQuery,
  context: ServerListQueryContext
) => Promise<ListResponse<TItem>>

type UseServerListOptions<
  TItem,
  TQuery extends ListQueryInput = ListQueryInput,
> = {
  queryKey: QueryKey
  query: TQuery
  queryFn: ServerListQueryFn<TItem, TQuery>
  enabled?: boolean
  staleTime?: number
}

export function buildServerListQueryKey(
  queryKey: QueryKey,
  query: ListQueryInput
) {
  return [...queryKey, serializeListQuery(query)] as const
}

export function buildServerListQuery(
  searchParams: URLSearchParams,
  config: ServerListQueryConfig = {}
): ListQueryInput {
  const pageKey = config.queryKeys?.page ?? "page"
  const perPageKey = config.queryKeys?.perPage ?? "perPage"
  const sortKey = config.queryKeys?.sort ?? "sort"
  const sorting = parseServerSorting(
    searchParams.get(sortKey),
    config.sortableColumns
  )
  const query: ListQueryInput = {
    page: positiveInteger(searchParams.get(pageKey), 1),
    perPage: positiveInteger(
      searchParams.get(perPageKey),
      config.defaultPageSize ?? 20
    ),
    ...sortToApiParams(sorting),
  }

  for (const filter of config.filters ?? []) {
    const value = parseFilterValue(searchParams.get(filter.urlKey), filter)
    const apiKey = filter.apiKey ?? filter.urlKey
    if (value !== undefined && query[apiKey] === undefined) {
      query[apiKey] = value
    }
  }
  return query
}

export function useServerListQuery(config: ServerListQueryConfig = {}) {
  const [searchParams] = useSearchParams()
  const serializedSearch = searchParams.toString()
  return useMemo(
    () => buildServerListQuery(new URLSearchParams(serializedSearch), config),
    [config, serializedSearch]
  )
}

export function applyServerListFilters(
  searchParams: URLSearchParams,
  values: ServerListFilterValues,
  config: ServerListQueryConfig
) {
  const next = new URLSearchParams(searchParams)
  const pageKey = config.queryKeys?.page ?? "page"
  const allowedKeys = new Set(
    (config.filters ?? []).map((filter) => filter.urlKey)
  )

  next.set(pageKey, "1")
  for (const [key, value] of Object.entries(values)) {
    if (!allowedKeys.has(key)) continue
    const serialized = Array.isArray(value)
      ? value.map(String).filter(Boolean).join(",")
      : value == null
        ? ""
        : String(value).trim()
    if (serialized) next.set(key, serialized)
    else next.delete(key)
  }
  return next
}

export function useServerList<
  TItem,
  TQuery extends ListQueryInput = ListQueryInput,
>({
  queryKey,
  query,
  queryFn,
  enabled = true,
  staleTime,
}: UseServerListOptions<TItem, TQuery>) {
  const result = useQuery({
    queryKey: buildServerListQueryKey(queryKey, query),
    queryFn: ({ signal }) => queryFn(query, { signal }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime,
  } satisfies UseQueryOptions<ListResponse<TItem>>)

  return {
    ...result,
    items: result.data?.items ?? [],
    page: result.data?.page ?? query.page ?? 1,
    perPage: result.data?.per_page ?? query.perPage ?? 20,
    total: result.data?.total ?? 0,
  }
}

function positiveInteger(raw: string | null, fallback: number) {
  const parsed = Number.parseInt(raw ?? "", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseServerSorting(raw: string | null, allowed?: readonly string[]) {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    const allowedSet = allowed ? new Set(allowed) : null
    return value.flatMap((item) => {
      if (!item || typeof item !== "object") return []
      const candidate = item as { id?: unknown; desc?: unknown }
      if (
        typeof candidate.id !== "string" ||
        typeof candidate.desc !== "boolean"
      ) {
        return []
      }
      if (allowedSet && !allowedSet.has(candidate.id)) return []
      return [{ id: candidate.id, desc: candidate.desc }]
    })
  } catch {
    return []
  }
}

function parseFilterValue(raw: string | null, config: ServerListFilterConfig) {
  const values = (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
  const allowed = config.allowedValues
    ? values.filter((value) => config.allowedValues?.includes(value))
    : values
  if (config.mode === "single") {
    return allowed.length === 1 ? allowed[0] : undefined
  }
  if (config.mode === "multi") {
    return allowed.length > 0 ? [...new Set(allowed)].join(",") : undefined
  }
  return raw?.trim() || undefined
}
