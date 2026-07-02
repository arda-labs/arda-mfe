import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { sessionApi } from "@/features/settings/api/session"
import { sessionKeys } from "@/features/settings/sessions/queries"

export const deviceKeys = {
  all: ["account", "devices"] as const,
  list: () => [...deviceKeys.all, "list"] as const,
}

export function useDevices() {
  return useQuery({
    queryKey: deviceKeys.list(),
    queryFn: () => sessionApi.devices(),
  })
}

export function useTrustDevice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => sessionApi.trustDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.all })
      notify.success("Device trusted")
    },
    onError: (error) => notify.error(translateApiError(error)),
  })
}

export function useDeleteDevice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => sessionApi.deleteDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.all })
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
      notify.success("Device removed")
    },
    onError: (error) => notify.error(translateApiError(error)),
  })
}
