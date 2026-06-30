export function getMediaContentUrl(publicId: string) {
  return `/api/media/${encodeURIComponent(publicId)}`
}

export function getMediaDownloadUrl(publicId: string) {
  return `/api/media/${encodeURIComponent(publicId)}/download`
}
