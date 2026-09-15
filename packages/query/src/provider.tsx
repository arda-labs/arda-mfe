import { useMemo, type ReactNode } from "react"
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
  type QueryClientConfig,
} from "@tanstack/react-query"
import { ApiClientError } from "@workspace/api/client"
import { getAuthScope, useAuthStore } from "@workspace/auth/store"

const DEFAULT_QUERY_CONFIG: QueryClientConfig = {
  defaultOptions: {
    queries: {
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiClientError && error.status < 500) return false
        return failureCount < 2
      },
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
    },
  },
}

export function createQueryClient(config: QueryClientConfig = {}) {
  return new QueryClient({
    ...DEFAULT_QUERY_CONFIG,
    ...config,
    defaultOptions: {
      ...DEFAULT_QUERY_CONFIG.defaultOptions,
      ...config.defaultOptions,
      queries: {
        ...DEFAULT_QUERY_CONFIG.defaultOptions?.queries,
        ...config.defaultOptions?.queries,
      },
      mutations: {
        ...DEFAULT_QUERY_CONFIG.defaultOptions?.mutations,
        ...config.defaultOptions?.mutations,
      },
    },
  })
}

type QueryProviderProps = {
  children: ReactNode
  client?: QueryClient
}

// This module is deliberately bundled per remote. Keep one client across route
// unmounts, but discard it synchronously when session/tenant/org identity changes.
let cachedScope: string | undefined
let cachedClient: QueryClient | undefined
useAuthStore.subscribe((state) => {
  if (cachedScope !== undefined && getAuthScope(state.user) !== cachedScope) {
    void cachedClient?.cancelQueries()
    cachedClient?.clear()
    cachedClient = undefined
    cachedScope = undefined
  }
})
export function getScopedQueryClient(scope: string) {
  if (!cachedClient || cachedScope !== scope) {
    void cachedClient?.cancelQueries()
    cachedClient?.clear()
    cachedScope = scope
    cachedClient = createQueryClient()
  }
  return cachedClient
}

export function QueryProvider({ children, client }: QueryProviderProps) {
  const scope = useAuthStore((state) => getAuthScope(state.user))
  const queryClient = useMemo(() => client ?? getScopedQueryClient(scope), [client, scope])
  return (
    <QueryClientProvider key={scope} client={queryClient}>{children}</QueryClientProvider>
  )
}

export function useAppQueryClient() {
  return useQueryClient()
}
