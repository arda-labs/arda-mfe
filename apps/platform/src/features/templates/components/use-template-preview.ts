import { useCallback } from "react"
import { useI18n } from "@workspace/i18n"
import type { FilePreviewSource } from "@workspace/ui/components/file-preview"
import { notify } from "@workspace/ui/feedback/notify"
import type { TemplateFileRef } from "../types"
import {
  resolveTemplateDownloadUrl,
  resolveTemplateFileUrl,
  templateFileName,
} from "../urls"

/** Opens the attachment through the API origin so the BFF session cookie is sent. */
function openTemplateFileDownload(fileUrl: string) {
  const url = resolveTemplateDownloadUrl(fileUrl)
  if (!url) return false
  window.open(url, "_blank", "noopener,noreferrer")
  return true
}

/**
 * Shared preview contract for the catalog table and the form dialog: every
 * entry point resolves the stored path (see urls.ts) and hands the universal
 * FilePreviewDialog a credentialed URL instead of the raw stored value.
 */
export function useTemplateFilePreview() {
  const { t } = useI18n()

  const download = useCallback(
    (file: TemplateFileRef) => {
      if (!openTemplateFileDownload(file.file_url)) {
        notify.error(t("platform.templates.preview.missing_file"))
      }
    },
    [t]
  )

  const buildSource = useCallback(
    (file: TemplateFileRef): FilePreviewSource | null => {
      const src = resolveTemplateFileUrl(file.file_url)
      if (!src) return null
      return {
        src,
        filename: templateFileName(file),
        title: t("platform.templates.preview.title", { name: file.name }),
        onDownload: () => download(file),
      }
    },
    [download, t]
  )

  return { buildSource, download }
}
