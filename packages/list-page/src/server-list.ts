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
import { parseSortingState } from "@workspace/ui/lib/parsers"
import { parsePositiveInteger } from "./list-url"

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
  const sorting = parseSortingState(
    searchParams.get(sortKey),
    config.sortableColumns ? new Set(config.sortableColumns) : undefined
  )
  const query: ListQueryInput = {
    page: parsePositiveInteger(searchParams.get(pageKey), 1),
    perPage: parsePositiveInteger(
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
