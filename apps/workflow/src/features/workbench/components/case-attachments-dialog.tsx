import { useCallback, useEffect, useRef, useState } from "react"
import { Download, Eye, Loader2, Paperclip, Upload } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { notify } from "@workspace/ui/feedback/notify"
import {
  listEntityFiles,
  uploadFile,
  type MediaFile,
} from "@workspace/media"
import {
  getPrivateMediaContentUrl,
  getPrivateMediaDownloadUrl,
} from "@workspace/media/urls"
import { formatDateTime } from "../utils/step-labels"
import type { WorkItem } from "../api"

const CASE_ENTITY_TYPE = "business_case"
const WORKFLOW_MODULE = "workflow"

/**
 * Attachments of a business case, backed by media-service entity links
 * (entity_type=business_case, entity_id=caseId). Users upload files that
 * become permanent case attachments; system-generated snapshots produced by
 * arda-doc land in the same list.
 */
export function CaseAttachmentsDialog({
  item,
  onClose,
}: {
  item: WorkItem | null
  onClose: () => void
}) {
  const { t } = useI18n()
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const caseId = item?.caseId ?? ""

  const load = useCallback(async () => {
    if (!caseId) return
    setLoading(true)
    try {
      setFiles(await listEntityFiles(CASE_ENTITY_TYPE, caseId, WORKFLOW_MODULE))
    } catch (error) {
      notify.error(
        t("workflow.workbench.attachments.load_error"),
        error instanceof Error ? error.message : undefined
      )
    } finally {
      setLoading(false)
    }
  }, [caseId, t])

  useEffect(() => {
    void load()
  }, [load])

  async function handleUpload(file: File) {
    if (!caseId) return
    setUploading(true)
    try {
      await uploadFile(file, WORKFLOW_MODULE, CASE_ENTITY_TYPE, caseId)
      await load()
    } catch (error) {
      notify.error(
        t("workflow.workbench.attachments.upload_error"),
        error instanceof Error ? error.message : undefined
      )
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function formatSize(bytes: number) {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${bytes} B`
  }

  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("workflow.workbench.attachments.title")}</DialogTitle>
          <DialogDescription>
            {item ? `${item.caseCode} — ${item.title}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("workflow.workbench.attachments.loading")}
            </div>
          ) : files.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("workflow.workbench.attachments.empty")}
            </p>
          ) : (
            files.map((file) => (
              <div
                key={file.public_id}
                className="flex items-center gap-3 rounded-md border px-3 py-2"
              >
                <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {file.original_filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(file.size_bytes)} ·{" "}
                    {formatDateTime(file.created_at)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    window.open(
                      getPrivateMediaContentUrl(file.public_id),
                      "_blank",
                      "noopener"
                    )
                  }
                >
                  <Eye className="size-4" />
                  {t("workflow.workbench.attachments.view")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    window.open(
                      getPrivateMediaDownloadUrl(file.public_id),
                      "_blank",
                      "noopener"
                    )
                  }
                >
                  <Download className="size-4" />
                  {t("workflow.workbench.attachments.download")}
                </Button>
              </div>
            ))
          )}
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            disabled={uploading || !caseId}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {uploading
              ? t("workflow.workbench.attachments.uploading")
              : t("workflow.workbench.attachments.upload")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleUpload(file)
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
