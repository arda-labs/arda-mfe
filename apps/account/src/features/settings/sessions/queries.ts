import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { sessionApi } from "@/features/settings/api/session"

export const sessionKeys = {
  all: ["account", "sessions"] as const,
  list: () => [...sessionKeys.all, "list"] as const,
}

export function useSessions() {
  return useQuery({
    queryKey: sessionKeys.list(),
    queryFn: () => sessionApi.list(),
  })
}

export function useRevokeSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => sessionApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
      notify.success("Session revoked")
    },
    onError: (error) => notify.error(translateApiError(error)),
  })
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (keep: string) => sessionApi.revokeOthers(keep),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
      notify.success("Other sessions revoked")
    },
    onError: (error) => notify.error(translateApiError(error)),
  })
}
