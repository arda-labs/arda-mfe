import { useCallback, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { attachEntityFiles, deleteFile, uploadFile, type MediaFile } from "@workspace/media"
import { StagedAttachmentsPanel } from "./case-attachments-panel"
import type { CaseTabItem } from "./types"

/**
 * Staged attachments for init screens (EPAS sends `taskProcessFiles` with the
 * process start): files upload to media-service as temp records (module tag
 * only, no entity), stay in local state, then attach to the created case with
 * `attachStagedCaseFiles(ids, caseId)` once the create call returns. Abandoned
 * forms leave temp files behind — the media TTL worker sweeps them.
 */
export function useStagedAttachments({ module }: { module: string }): {
  ids: string[]
  tab: CaseTabItem
} {
  const { t } = useI18n()
  const [files, setFiles] = useState<MediaFile[]>([])
  const [uploading, setUploading] = useState(false)

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true)
      try {
        const uploaded = await uploadFile(file, module, "", "")
        setFiles((prev) => [
          ...prev,
          {
            public_id: uploaded.public_id,
            module,
            original_filename: uploaded.file_name || file.name,
            content_type: file.type,
            size_bytes: file.size,
            status: "temp",
            scan_status: "pending",
            visibility: "private",
            created_at: new Date().toISOString(),
          },
        ])
      } catch (error) {
        notify.error(
          t("case_tabs.attachments.upload_error"),
          error instanceof Error ? error.message : undefined
        )
      } finally {
        setUploading(false)
      }
    },
    [module, t]
  )

  const handleRemove = useCallback(
    async (publicId: string) => {
      try {
        await deleteFile(publicId)
      } catch (error) {
        notify.error(
          t("case_tabs.attachments.remove_error"),
          error instanceof Error ? error.message : undefined
        )
        return
      }
      setFiles((prev) => prev.filter((item) => item.public_id !== publicId))
    },
    [t]
  )

  const tab: CaseTabItem = {
    id: "case-attachments",
    label: t("case_tabs.attachments.title"),
    content: (
      <StagedAttachmentsPanel
        files={files}
        uploading={uploading}
        onUpload={(file) => void handleUpload(file)}
        onRemove={(publicId) => void handleRemove(publicId)}
      />
    ),
  }

  return { ids: files.map((item) => item.public_id), tab }
}

/** Attach staged temp files to the created case (no-op when either is empty). */
export async function attachStagedCaseFiles(publicIds: string[], caseId: string) {
  const ids = publicIds.filter(Boolean)
  if (ids.length === 0 || !caseId) return
  await attachEntityFiles(ids, "business_case", caseId)
}
