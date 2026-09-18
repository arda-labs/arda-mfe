import { useCallback } from "react"
import { translateApiError, useI18n } from "@workspace/i18n"
import { ApiClientError } from "@workspace/api"
import { downloadMediaFile, fetchMediaBlob } from "@workspace/media"
import {
  detectFileCategory,
  type FilePreviewSource,
} from "@workspace/ui/components/file-preview"
import { notify } from "@workspace/ui/feedback/notify"
import type { TemplateFileRef } from "../types"
import {
  resolveTemplateDownloadUrl,
  templateFileName,
  toTemplateFilePath,
} from "../urls"

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string

/** Categories the universal preview can render inline. */
const INLINE_PREVIEW_CATEGORIES = new Set([
  "pdf",
  "image",
  "video",
  "audio",
  "code",
  "csv",
  "text",
])

/** Above this size the dialog shows the file card + download instead of an
 * inline preview, keeping large documents out of browser memory. */
const MAX_INLINE_PREVIEW_BYTES = 25 * 1024 * 1024

/** Maps media-scope failures to an actionable message. */
export function describeTemplateFileError(err: unknown, t: TranslateFn) {
  if (err instanceof ApiClientError) {
    if (err.code === "tenant.error.scope_required") {
      return t("platform.templates.preview.org_required")
    }
    if (err.status === 404 || err.code === "media.file.not_ready") {
      return t("platform.templates.preview.file_missing")
    }
  }
  return translateApiError(err)
}

/**
 * Shared preview/download contract for the catalog table and the form dialog.
 * Private media must be fetched through the API client (session cookie +
 * `X-Org-Id`); a plain `window.open`/iframe cannot attach that header and the
 * media-service rejects it with `tenant.error.scope_required`.
 */
export function useTemplateFilePreview() {
  const { t } = useI18n()

  const download = useCallback(
    async (file: TemplateFileRef) => {
      const path = toTemplateFilePath(file.file_url)
      if (!path) {
        notify.error(t("platform.templates.preview.missing_file"))
        return
      }
      try {
        if (path.startsWith("/api/")) {
          await downloadMediaFile(path, templateFileName(file))
        } else {
          window.open(path, "_blank", "noopener,noreferrer")
          return
        }
        notify.success(
          t("platform.templates.preview.download_success", {
            name: templateFileName(file),
          })
        )
      } catch (err) {
        // Network/CORS failures (ApiClientError = the API answered and
        // explained the problem) degrade to a browser navigation: the media
        // endpoint redirects to a public presigned URL with no CORS checks.
        if (
          !(err instanceof ApiClientError) &&
          window.open(
            resolveTemplateDownloadUrl(file.file_url),
            "_blank",
            "noopener,noreferrer"
          )
        ) {
          return
        }
        notify.error(
          t("platform.templates.preview.download_failed"),
          describeTemplateFileError(err, t)
        )
      }
    },
    [t]
  )

  const buildSource = useCallback(
    async (file: TemplateFileRef): Promise<FilePreviewSource | null> => {
      const path = toTemplateFilePath(file.file_url)
      if (!path) return null
      const filename = templateFileName(file)
      const base = {
        filename,
        title: t("platform.templates.preview.title", { name: file.name }),
        onDownload: () => {
          void download(file)
        },
      }
      if (!path.startsWith("/api/")) return { ...base, src: path }
      // Office documents fall back to the file card; fetching the bytes would
      // only waste memory since no renderer consumes them.
      if (!INLINE_PREVIEW_CATEGORIES.has(detectFileCategory(filename))) {
        return base
      }
      const blob = await fetchMediaBlob(path)
      if (blob.size > MAX_INLINE_PREVIEW_BYTES) {
        return base
      }
      return { ...base, src: URL.createObjectURL(blob) }
    },
    [download, t]
  )

  return { buildSource, download }
}
