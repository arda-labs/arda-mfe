import { useQuery } from "@tanstack/react-query"
import { auditApi } from "@/features/iam/audit"

export const auditKeys = {
  all: ["iam", "audit"] as const,
  list: (params: {
    event_type?: string[]
    subject?: string
    result?: string
    page: number
    size: number
    sort?: string
  }) => [...auditKeys.all, "list", params] as const,
  stats: (from: string, to: string) => [...auditKeys.all, "stats", from, to] as const,
  verify: (from: string, to: string) => [...auditKeys.all, "verify", from, to] as const,
}

export function useAuditEvents(params: {
  event_type?: string[]
  subject?: string
  result?: string
  page: number
  size: number
  sort?: string
}) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => auditApi.query(params),
  })
}

export function useAuditStats(from: string, to: string) {
  return useQuery({
    queryKey: auditKeys.stats(from, to),
    queryFn: () => auditApi.stats(from, to),
  })
}

export function useAuditChainVerification(from: string, to: string, enabled: boolean) {
  return useQuery({
    queryKey: auditKeys.verify(from, to),
    queryFn: () => auditApi.verify(from, to),
    enabled,
  })
}
