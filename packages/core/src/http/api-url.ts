const productionWebOrigin = "https://arda.io.vn"
const productionApiOrigin = "https://api.arda.io.vn"

export function getApiBaseURL(): string {
  if (typeof window === "undefined") return ""
  return window.location.origin === productionWebOrigin
    ? productionApiOrigin
    : ""
}

export function apiUrl(path: string): string {
  if (!path.startsWith("/api")) return path
  return `${getApiBaseURL()}${path}`
}
