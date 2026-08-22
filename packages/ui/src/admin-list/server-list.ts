import {
  keepPreviousData,
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query"
import {
  serializeListQuery,
  type ListQueryInput,
  type ListResponse,
} from "@workspace/core/http/list-api"

export type ServerListQueryContext = {
  signal: AbortSignal
}

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

/**
 * Shared server-state primitive for paginated endpoints.
 *
 * The canonical serialized query prevents object/array identity changes from
 * triggering fetch loops. TanStack Query owns dedupe, cancellation and cache.
 */
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
