import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { scheduledJobsApi } from "./api"
import type { JobConfigUpdate, JobStatus } from "./types"

/** Query-key factory (R6); every mutation invalidates `all`. */
export const scheduledJobKeys = {
  all: ["platform", "scheduled-jobs"] as const,
  list: () => [...scheduledJobKeys.all, "list"] as const,
  runs: (code: string, page: number, status: string) =>
    [...scheduledJobKeys.all, "runs", code, page, status] as const,
  run: (id: string) => [...scheduledJobKeys.all, "run", id] as const,
  preview: (cronExpr: string, timezone: string) =>
    [...scheduledJobKeys.all, "preview", cronExpr, timezone] as const,
}

export function useScheduledJobs() {
  return useQuery({
    queryKey: scheduledJobKeys.list(),
    queryFn: () => scheduledJobsApi.list(),
  })
}

export function useJobRuns(code: string | null, page: number, status: JobStatus | "") {
  return useQuery({
    queryKey: scheduledJobKeys.runs(code ?? "", page, status),
    queryFn: () => scheduledJobsApi.listRuns(code as string, page, status),
    enabled: !!code,
  })
}

export function useJobRun(id: string | null) {
  return useQuery({
    queryKey: scheduledJobKeys.run(id ?? ""),
    queryFn: () => scheduledJobsApi.getRun(id as string),
    enabled: !!id,
  })
}

/**
 * Next activations of a cron expression. 400 `platform.jobs.invalid_schedule`
 * surfaces as `error`; never retried (the client treats < 500 as final).
 */
export function useCronPreview(cronExpr: string, timezone: string, enabled = true) {
  const expr = cronExpr.trim()
  const tz = timezone.trim()
  return useQuery({
    queryKey: scheduledJobKeys.preview(expr, tz),
    queryFn: () => scheduledJobsApi.preview(expr, tz),
    enabled: enabled && !!expr && !!tz,
    retry: false,
    staleTime: 60_000,
  })
}

export function useUpdateJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ code, body }: { code: string; body: JobConfigUpdate }) =>
      scheduledJobsApi.update(code, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scheduledJobKeys.all }),
  })
}

export function useRunJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ code, params }: { code: string; params?: Record<string, string> }) =>
      scheduledJobsApi.run(code, params),
    onSettled: () => queryClient.invalidateQueries({ queryKey: scheduledJobKeys.all }),
  })
}

/** Refetches the job list, e.g. after a 409 version conflict. */
export function useReloadJobs() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: scheduledJobKeys.all })
}
