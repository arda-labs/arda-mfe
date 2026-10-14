import { api, type ApiSuccess } from "@workspace/api"
import type { CccdExtractResult, DocumentCapabilities, ExtractErrorKind } from "./types"

export async function fetchCapabilities(signal?: AbortSignal): Promise<DocumentCapabilities> {
  const res = await api.get<ApiSuccess<DocumentCapabilities>>("/api/documents/capabilities", { signal })
  return res.result
}

export async function extractCccd(front: Blob, back: Blob | undefined, signal?: AbortSignal): Promise<CccdExtractResult> {
  const form = new FormData()
  form.append("doc_type", "cccd")
  form.append("front", front, "front.jpg")
  if (back) form.append("back", back, "back.jpg")
  const res = await api.post<ApiSuccess<CccdExtractResult>>("/api/documents/extract", form, { signal })
  return res.result
}

/** Duck-typed so it accepts ApiClientError and plain objects in tests. */
export function classifyExtractError(err: unknown): ExtractErrorKind {
  const e = (err ?? {}) as { status?: number; code?: string }
  switch (e.code) {
    case "document.extract.not_a_document":
      return "not_document"
    case "document.extract.image_too_large":
    case "validation.body_too_large":
      return "too_large"
    case "document.extract.unsupported_media_type":
      return "unsupported"
    case "document.extract.model_timeout":
      return "timeout"
    case "document.extract.model_bad_output":
      return "bad_output"
    case "document.extract.model_unavailable":
      return "unavailable"
    case "recent_auth_required":
      // Gateway step-up (403) is a re-authentication prompt, not a missing permission.
      return "unknown"
  }
  if (e.status === 413) return "too_large"
  if (e.status === 403) return "forbidden"
  if (e.status === 502 || e.status === 504) return "timeout"
  if (e.status === 503) return "unavailable"
  return "unknown"
}
