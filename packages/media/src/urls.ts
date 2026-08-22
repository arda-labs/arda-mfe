import { apiUrl } from "@workspace/api/url"

export function getMediaContentUrl(publicId: string) {
  return apiUrl(`/api/media/${encodeURIComponent(publicId)}`)
}

export function getMediaDownloadUrl(publicId: string) {
  return apiUrl(`/api/media/${encodeURIComponent(publicId)}/download`)
}
