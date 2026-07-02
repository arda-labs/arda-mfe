import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { mfaApi, type MFAStatus } from "@/features/settings/api/mfa"

export const mfaKeys = {
  all: ["account", "mfa"] as const,
  status: () => [...mfaKeys.all, "status"] as const,
}

export function useMfaStatus() {
  return useQuery({
    queryKey: mfaKeys.status(),
    queryFn: () => mfaApi.status(),
  })
}

export function useEnrollMfa() {
  return useMutation({
    mutationFn: () => mfaApi.getSecret(),
    onError: (error) => notify.error(translateApiError(error)),
  })
}

export function useVerifyMfaEnrollment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (code: string) => mfaApi.verifyEnroll(code),
    onSuccess: () => {
      queryClient.setQueryData<MFAStatus>(mfaKeys.status(), { is_enrolled: true, method: "totp" })
      queryClient.invalidateQueries({ queryKey: mfaKeys.all })
      notify.success("Two-factor authentication enabled")
    },
    onError: (error) => notify.error(translateApiError(error)),
  })
}

export function useResetMfa() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => mfaApi.reset(),
    onSuccess: () => {
      queryClient.setQueryData<MFAStatus>(mfaKeys.status(), { is_enrolled: false, method: "" })
      queryClient.invalidateQueries({ queryKey: mfaKeys.all })
      notify.success("Two-factor authentication reset")
    },
    onError: (error) => notify.error(translateApiError(error)),
  })
}
