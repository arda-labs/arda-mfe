import { apiUrl } from "@workspace/api/url"

export function getMediaContentUrl(publicId: string) {
  return apiUrl(`/api/media/public/${encodeURIComponent(publicId)}`)
}

export function getMediaDownloadUrl(publicId: string) {
  return apiUrl(`/api/media/public/${encodeURIComponent(publicId)}/download`)
}

export function getPrivateMediaContentUrl(publicId: string) {
  return apiUrl(`/api/media/${encodeURIComponent(publicId)}`)
}

export function getPrivateMediaDownloadUrl(publicId: string) {
  return apiUrl(`/api/media/${encodeURIComponent(publicId)}/download`)
}
