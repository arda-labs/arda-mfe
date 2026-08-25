import { api, type ApiSuccess } from "@workspace/api"
import { getMediaContentUrl, getMediaDownloadUrl } from "./urls"

type IAMUserContext = {
  userId: string
  subject: string
  username: string
  email: string
  picture?: string
  avatarFileId?: string
}

export { getMediaContentUrl, getMediaDownloadUrl }

export async function uploadFile(
  file: File,
  module: string,
  entityType: string,
  entityId: string
) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("module", module)
  formData.append("entity_type", entityType)
  formData.append("entity_id", entityId)

  const res = await api.post<ApiSuccess<{
    public_id: string
    file_name: string
    mime_type: string
    size: number
    created_at: string
  }>>("/api/media", formData)
  const result = res.result

  return {
    public_id: result.public_id,
    file_name: result.file_name,
    url: getMediaContentUrl(result.public_id),
  }
}

export async function uploadAvatar(file: File, userId: string) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("module", "iam")
  formData.append("entity_type", "iam_user")
  formData.append("entity_id", userId)

  const res = await api.post<ApiSuccess<{ public_id: string }>>("/api/media", formData)
  const result = res.result
  const profileResponse = await api.post<ApiSuccess<IAMUserContext>>(
    "/api/iam/me/profile/avatar",
    { avatar_file_id: result.public_id }
  )

  return {
    public_id: result.public_id,
    url: getMediaContentUrl(result.public_id),
    profile: profileResponse.result,
  }
}

export async function uploadCover(file: File, userId: string) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("module", "iam")
  formData.append("entity_type", "iam_user_cover")
  formData.append("entity_id", userId)

  const res = await api.post<ApiSuccess<{ public_id: string }>>("/api/media", formData)
  const result = res.result
  const profileResponse = await api.post<ApiSuccess<IAMUserContext>>(
    "/api/iam/me/profile/cover",
    {
      cover_file_id: result.public_id,
      cover_image_url: getMediaContentUrl(result.public_id),
    }
  )

  return {
    public_id: result.public_id,
    url: getMediaContentUrl(result.public_id),
    profile: profileResponse.result,
  }
}
