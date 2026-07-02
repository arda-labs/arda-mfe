import { useMutation } from "@tanstack/react-query"
import { api } from "@workspace/api"
import type { AuthUser } from "@workspace/auth/store"
import { translateApiError, useI18n } from "@workspace/i18n"
import { uploadAvatar, uploadCover } from "@workspace/media"
import { notify } from "@workspace/notifications/notify"

export interface ProfileUpdatePayload {
  name: string
  nickname?: string
  first_name?: string
  last_name?: string
  phone_number?: string
  birthdate?: string
  gender?: string
  address?: string
  country?: string
  headline?: string
  department?: string
  employee_id?: string
  approval_level?: string
  daily_limit?: string
  bio?: string
}

export type ProfileUpdateResponse = Partial<AuthUser>

export function useUpdateProfile() {
  const { t } = useI18n()

  return useMutation({
    mutationFn: (payload: ProfileUpdatePayload) =>
      api.put<ProfileUpdateResponse>("/api/iam/me/profile", payload),
    onSuccess: () => notify.success(t("profile.update_success")),
    onError: () => notify.error("Error updating profile"),
  })
}

export function useUploadAvatar() {
  const { t } = useI18n()

  return useMutation({
    mutationFn: ({ file, userId }: { file: File; userId: string }) => uploadAvatar(file, userId),
    onSuccess: () => notify.success(t("profile.avatar.upload_success")),
    onError: (error) => notify.error(translateApiError(error, "profile.avatar.upload_failed")),
  })
}

export function useUploadCover() {
  return useMutation({
    mutationFn: ({ file, userId }: { file: File; userId: string }) => uploadCover(file, userId),
    onSuccess: () => notify.success("Cover image updated"),
    onError: () => notify.error("Failed to upload cover image"),
  })
}
