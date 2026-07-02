import { useMutation } from "@tanstack/react-query"
import { api } from "@workspace/api"
import { translateApiError, useI18n } from "@workspace/i18n"
import { uploadAvatar } from "@workspace/media"
import { notify } from "@workspace/notifications/notify"

export function useUploadAvatar() {
  const { t } = useI18n()

  return useMutation({
    mutationFn: ({ file, userId }: { file: File; userId: string }) => uploadAvatar(file, userId),
    onSuccess: () => notify.success(t("profile.avatar.upload_success")),
    onError: (error) => notify.error(translateApiError(error, "profile.avatar.upload_failed")),
  })
}

export function useUpdateEmail() {
  return useMutation({
    mutationFn: (email: string) => api.put<{ email: string }>("/api/identity/me/email", { email }),
    onSuccess: () => notify.success("Email updated"),
    onError: (error) => notify.error(translateApiError(error)),
  })
}
