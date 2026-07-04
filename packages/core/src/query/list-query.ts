import {
  keepPreviousData,
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query"

/** Admin / IAM / platform master data — short client cache is acceptable. */
export const ADMIN_LIST_STALE_TIME_MS = 10_000

/** Finance / banking-style lists — always treat data as stale; refetch on filter change. */
export const FINANCIAL_LIST_STALE_TIME_MS = 0

export type ListQueryProfile = "admin" | "financial"

const LIST_QUERY_PROFILE_DEFAULTS: Record<
  ListQueryProfile,
  { staleTime: number; refetchOnWindowFocus: boolean }
> = {
  admin: {
    staleTime: ADMIN_LIST_STALE_TIME_MS,
    refetchOnWindowFocus: false,
  },
  financial: {
    staleTime: FINANCIAL_LIST_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  },
}

type ListQueryOptions<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  "placeholderData"
> & {
  profile?: ListQueryProfile
}

export function useListQuery<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>({
  profile = "admin",
  ...options
}: ListQueryOptions<TQueryFnData, TError, TData, TQueryKey>) {
  const profileDefaults = LIST_QUERY_PROFILE_DEFAULTS[profile]

  return useQuery<TQueryFnData, TError, TData, TQueryKey>({
    placeholderData: keepPreviousData,
    ...profileDefaults,
    ...options,
  })
}

export function useFinancialListQuery<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: Omit<
    ListQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
    "profile"
  >,
) {
  return useListQuery({ ...options, profile: "financial" })
}

export function listQueryShellState(
  query: Pick<
    UseQueryResult<unknown, unknown>,
    "isPending" | "isFetching" | "data"
  >,
) {
  const hasData = query.data !== undefined

  return {
    initialLoading: query.isPending && !hasData,
    fetching: query.isFetching && hasData,
  }
}

export function combineListQueryShellState(
  ...queries: Array<
    Pick<UseQueryResult<unknown, unknown>, "isPending" | "isFetching" | "data">
  >
) {
  return {
    initialLoading: queries.some(
      (query) => listQueryShellState(query).initialLoading,
    ),
    fetching: queries.some((query) => listQueryShellState(query).fetching),
  }
}

type PageGateQuery = Pick<
  UseQueryResult<unknown, unknown>,
  "isPending" | "data" | "error" | "refetch"
>

/** Critical initial-load gate: list + required lookups (not refetch / filter changes). */
export function pageGateFromQueries(...queries: PageGateQuery[]) {
  const criticalPending = queries.some(
    (query) => query.isPending && query.data === undefined,
  )
  const failed = queries.find(
    (query) => query.error != null && query.data === undefined,
  )

  return {
    criticalPending,
    criticalError: failed?.error ?? null,
    onRetry: () => Promise.all(queries.map((query) => query.refetch())),
  }
}
