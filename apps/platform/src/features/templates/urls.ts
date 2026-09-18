import { apiUrl } from "@workspace/api/url"
import type { TemplateFileRef } from "./types"

const ARDA_ROOT_HOST = "arda.io.vn"
const API_PATH_PREFIX = "/api/"
const RELATIVE_URL_HOST = "template.internal.invalid"
const RELATIVE_URL_BASE = `https://${RELATIVE_URL_HOST}`
const FILE_NAME_PATTERN = /\.[a-z0-9]{1,10}$/i

function isArdaHost(hostname: string) {
  const host = hostname.toLowerCase()
  return host === ARDA_ROOT_HOST || host.endsWith(`.${ARDA_ROOT_HOST}`)
}

/**
 * Template files are stored as media API paths (`/api/media/<public_id>`) or,
 * for external documents, as absolute URLs. Uploads made from a deployment
 * that is not `arda.io.vn` (preview builds, local dev) come back host-relative,
 * so the DB can hold a bare path. Strip the deployment origin for our own API
 * URLs so the stored value stays portable across environments.
 */
export function toTemplateFilePath(fileUrl: string): string {
  const trimmed = fileUrl.trim()
  if (!trimmed) return ""
  try {
    const parsed = new URL(trimmed, RELATIVE_URL_BASE)
    const ownHost =
      isArdaHost(parsed.hostname) || parsed.hostname === RELATIVE_URL_HOST
    if (ownHost && parsed.pathname.startsWith(API_PATH_PREFIX)) {
      return `${parsed.pathname}${parsed.search}`
    }
  } catch {
    return trimmed
  }
  return trimmed
}

/**
 * Resolves a stored template file reference to the origin that owns the BFF
 * session cookie. A bare `/api/media/...` path opened against the web origin
 * hits the shell Worker without the `api.arda.io.vn` cookie and fails with
 * `not_authenticated`; `apiUrl` maps it back to the API origin contract.
 */
export function resolveTemplateFileUrl(fileUrl: string): string {
  const path = toTemplateFilePath(fileUrl)
  if (!path) return ""
  return apiUrl(path)
}

/** Same as {@link resolveTemplateFileUrl} but forces `Content-Disposition: attachment`. */
export function resolveTemplateDownloadUrl(fileUrl: string): string {
  const path = toTemplateFilePath(fileUrl)
  if (!path) return ""
  // Only our media API exposes the `/download` contract; external documents
  // are served as-is.
  if (!path.startsWith(API_PATH_PREFIX)) return path
  const queryIndex = path.indexOf("?")
  const basePath = queryIndex >= 0 ? path.slice(0, queryIndex) : path
  const query = queryIndex >= 0 ? path.slice(queryIndex) : ""
  const downloadPath = basePath.endsWith("/download")
    ? `${basePath}${query}`
    : `${basePath}/download${query}`
  return apiUrl(downloadPath)
}

/**
 * Public id of the attached media (`mf_...`), or empty when the stored value
 * is an external URL without one. Used to enrich rows with media metadata.
 */
export function templatePublicId(fileUrl: string): string {
  const path = toTemplateFilePath(fileUrl)
  if (!path) return ""
  const segments = path.split("?")[0].split("/").filter(Boolean)
  const last = segments[segments.length - 1] ?? ""
  const candidate =
    last === "download" ? (segments[segments.length - 2] ?? "") : last
  return candidate.startsWith("mf_") ? candidate : ""
}

/**
 * Display name for the attached file. Prefers the original filename from the
 * media metadata (media public ids keep no extension in the URL), then the
 * stored URL basename, finally `<code>.<file_type>`.
 */
export function templateFileName(
  file: TemplateFileRef,
  meta?: { original_filename?: string }
): string {
  const original = meta?.original_filename?.trim()
  if (original) return original
  const path = toTemplateFilePath(file.file_url)
  if (path) {
    const segment = path.split("?")[0].split("/").filter(Boolean).pop() ?? ""
    let base = segment
    try {
      base = decodeURIComponent(segment)
    } catch {
      // Keep the raw segment when it is not valid percent-encoding.
    }
    if (base && FILE_NAME_PATTERN.test(base)) return base
  }
  const stem = file.code || file.name || "template"
  return file.file_type ? `${stem}.${file.file_type}` : stem
}
