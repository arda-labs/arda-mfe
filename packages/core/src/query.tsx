import { createElement, type PropsWithChildren } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 10_000,
    },
    mutations: {
      retry: 0,
    },
  },
})

export function ArdaQueryProvider({ children }: PropsWithChildren) {
  return createElement(QueryClientProvider, { client: queryClient }, children)
}
