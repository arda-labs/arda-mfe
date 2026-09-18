import { useCallback } from "react"
import { translateApiError, useI18n } from "@workspace/i18n"
import { ApiClientError } from "@workspace/api"
import {
  downloadMediaFile,
  fetchMediaBlob,
  getPrivateMediaPreviewUrl,
  mediaErrorReason,
} from "@workspace/media"
import {
  detectFileCategory,
  toPdfFileName,
  useBlobPreview,
} from "@workspace/ui/components/file-preview"
import { notify } from "@workspace/ui/feedback/notify"
import type { TemplateFileTarget } from "../types"
import {
  resolveTemplateDownloadUrl,
  templateFileName,
  templatePublicId,
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

/** Word documents convert to PDF server-side (Gotenberg) before rendering.
 * Excel is download-only in the app: a wide sheet paginated into a PDF reads
 * worse than the file itself. */
const OFFICE_PREVIEW_CATEGORIES = new Set(["word"])

/** Above this size the dialog shows the file card + download instead of an
 * inline preview, keeping large documents out of browser memory. */
const MAX_INLINE_PREVIEW_BYTES = 25 * 1024 * 1024

/** Maps media failures to an actionable message. */
export function describeTemplateFileError(err: unknown, t: TranslateFn) {
  switch (mediaErrorReason(err)) {
    case "org_required":
      return t("platform.templates.preview.org_required")
    case "not_found":
      return t("platform.templates.preview.file_missing")
    case "too_large":
      return t("platform.templates.preview.file_too_large")
    default:
      return translateApiError(err)
  }
}

/**
 * Shared preview/download contract for the catalog table and the form dialog.
 * Private media must be fetched through the API client (session cookie +
 * `X-Org-Id`); a plain `window.open`/iframe cannot attach that header and the
 * media-service rejects it with `tenant.error.scope_required`.
 */
export function useTemplateFilePreview() {
  const { t } = useI18n()
  const { source, loading, show, openWithBlob, close } = useBlobPreview()

  const download = useCallback(
    async (file: TemplateFileTarget) => {
      const path = toTemplateFilePath(file.file_url)
      if (!path) {
        notify.error(t("platform.templates.preview.missing_file"))
        return
      }
      const filename = templateFileName(file, file.fileMeta)
      try {
        if (path.startsWith("/api/")) {
          await downloadMediaFile(path, filename)
        } else {
          window.open(path, "_blank", "noopener,noreferrer")
          return
        }
        notify.success(
          t("platform.templates.preview.download_success", { name: filename })
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

  const openPreview = useCallback(
    async (file: TemplateFileTarget) => {
      const path = toTemplateFilePath(file.file_url)
      if (!path) {
        notify.error(t("platform.templates.preview.missing_file"))
        return
      }
      const filename = templateFileName(file, file.fileMeta)
      const base = {
        filename,
        mimeType: file.fileMeta?.content_type,
        sizeBytes: file.fileMeta?.size_bytes,
        title: t("platform.templates.preview.title", { name: file.name }),
        onDownload: () => {
          void download(file)
        },
      }
      if (!path.startsWith("/api/")) {
        show({ ...base, src: path })
        return
      }
      const category = detectFileCategory(filename, file.fileMeta?.content_type)
      const publicId = templatePublicId(file.file_url)
      // Word/Excel convert to PDF through Gotenberg first; a failed or slow
      // conversion degrades to the file card with the download button.
      if (OFFICE_PREVIEW_CATEGORIES.has(category) && publicId) {
        try {
          await openWithBlob(
            () => fetchMediaBlob(getPrivateMediaPreviewUrl(publicId)),
            {
              ...base,
              filename: toPdfFileName(filename),
              mimeType: "application/pdf",
            },
            { pending: true }
          )
        } catch {
          show(base)
        }
        return
      }
      const tooLarge =
        (file.fileMeta?.size_bytes ?? 0) > MAX_INLINE_PREVIEW_BYTES
      if (!INLINE_PREVIEW_CATEGORIES.has(category) || tooLarge) {
        show(base)
        return
      }
      try {
        await openWithBlob(() => fetchMediaBlob(path), base)
      } catch (err) {
        notify.error(
          t("platform.templates.preview.view_failed"),
          describeTemplateFileError(err, t)
        )
      }
    },
    [download, openWithBlob, show, t]
  )

  return {
    openPreview,
    download,
    previewSource: source,
    previewLoading: loading,
    closePreview: close,
  }
}
