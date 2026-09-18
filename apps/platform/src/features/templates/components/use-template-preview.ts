import { useCallback } from "react"
import { translateApiError, useI18n } from "@workspace/i18n"
import { ApiClientError } from "@workspace/api"
import { downloadMediaFile, fetchMediaBlob } from "@workspace/media"
import type { FilePreviewSource } from "@workspace/ui/components/file-preview"
import { notify } from "@workspace/ui/feedback/notify"
import type { TemplateFileRef } from "../types"
import { templateFileName, toTemplateFilePath } from "../urls"

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string

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
      const src = path.startsWith("/api/")
        ? URL.createObjectURL(await fetchMediaBlob(path))
        : path
      return {
        src,
        filename,
        title: t("platform.templates.preview.title", { name: file.name }),
        onDownload: () => {
          void download(file)
        },
      }
    },
    [download, t]
  )

  return { buildSource, download }
}
