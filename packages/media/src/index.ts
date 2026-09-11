import { api, type ApiSuccess } from "@workspace/api"
import {
  getMediaContentUrl,
  getMediaDownloadUrl,
  getPrivateMediaContentUrl,
  getPrivateMediaDownloadUrl,
} from "./urls"

type IAMUserContext = {
  userId: string
  subject: string
  username: string
  email: string
  picture?: string
  avatarFileId?: string
}

export {
  getMediaContentUrl,
  getMediaDownloadUrl,
  getPrivateMediaContentUrl,
  getPrivateMediaDownloadUrl,
}

export type MediaFile = {
  public_id: string
  module: string
  entity_type?: string
  entity_id?: string
  original_filename: string
  content_type: string
  size_bytes: number
  status: string
  scan_status: string
  visibility: string
  created_at: string
}

/**
 * Attach uploaded temp files to an owner entity (entity_type + entity_id).
 * media-service creates every upload in status `temp` with an expiry; attach
 * is what makes the file permanent and visible in entity listings.
 */
export async function attachEntityFiles(
  publicIds: string[],
  ownerType: string,
  ownerId: string
) {
  const res = await api.post<ApiSuccess<{ attached: number }>>(
    "/api/media/files/attach",
    { public_ids: publicIds, owner_type: ownerType, owner_id: ownerId }
  )
  return res.result
}

/** List files attached to an entity, newest first (BE default limit 50). */
export async function listEntityFiles(
  entityType: string,
  entityId: string,
  module?: string
) {
  const search = new URLSearchParams({ entity_type: entityType, entity_id: entityId })
  if (module) search.set("module", module)
  const res = await api.get<ApiSuccess<{ files: MediaFile[]; count: number }>>(
    `/api/media/files?${search.toString()}`
  )
  return res.result.files ?? []
}

export async function uploadFile(
  file: File,
  module: string,
  entityType: string,
  entityId: string,
  visibility = "private"
) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("module", module)
  formData.append("entity_type", entityType)
  formData.append("entity_id", entityId)
  formData.append("visibility", visibility)

  const res = await api.post<ApiSuccess<{
    public_id: string
    file_name: string
    mime_type: string
    size: number
    created_at: string
  }>>("/api/media", formData)
  const result = res.result

  // Direct uploads stay `temp` on the server (entity fields are ignored at
  // upload time), so attach immediately or the file expires and is cleaned
  // up by the TTL worker.
  if (entityType && entityId) {
    await attachEntityFiles([result.public_id], entityType, entityId)
  }

  return {
    public_id: result.public_id,
    file_name: result.file_name,
    url: visibility === "public" ? getMediaContentUrl(result.public_id) : getPrivateMediaContentUrl(result.public_id),
  }
}

export async function uploadAvatar(file: File, userId: string) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("module", "iam")
  formData.append("entity_type", "iam_user")
  formData.append("entity_id", userId)
  formData.append("visibility", "public")

  const res = await api.post<ApiSuccess<{ public_id: string }>>("/api/media", formData)
  const result = res.result
  const profileResponse = await api.post<ApiSuccess<IAMUserContext>>(
    "/api/iam/me/profile/avatar",
    {
      avatar_file_id: result.public_id,
      picture_url: getMediaContentUrl(result.public_id),
    }
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
  formData.append("visibility", "public")

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
