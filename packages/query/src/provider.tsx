import { useState, type ReactNode } from "react"
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
  type QueryClientConfig,
} from "@tanstack/react-query"
import { ApiClientError } from "@workspace/api/client"

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

export function QueryProvider({
  children,
  client,
}: QueryProviderProps) {
  const [queryClient] = useState(() => client ?? createQueryClient())
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

export function useAppQueryClient() {
  return useQueryClient()
}
