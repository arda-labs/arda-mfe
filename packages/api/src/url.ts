const productionWebOrigin = "https://arda.io.vn"
const productionApiOrigin = "https://api.arda.io.vn"

// Deployment bootstrap may pin the API origin explicitly (e.g. a Cloudflare
// Worker boot file reading its own bindings); when set it wins over the
// production-origin contract below so this library never hardcodes domains.
let configuredOverride: string | null = null

export function configureApiBaseURL(origin?: string) {
  configuredOverride = origin?.trim() || null
}

export function getApiBaseURL(): string {
  if (configuredOverride !== null) return configuredOverride
  if (typeof window === "undefined") return ""
  return window.location.origin === productionWebOrigin
    ? productionApiOrigin
    : ""
}

export function apiUrl(path: string): string {
  if (!path.startsWith("/api")) return path
  return `${getApiBaseURL()}${path}`
}
