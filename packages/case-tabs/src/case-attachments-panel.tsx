import { useCallback, useEffect, useRef, useState } from "react"
import {
  Download,
  Eye,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react"
import { translateApiError, useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  FilePreviewDrawer,
  detectFileCategory,
  toPdfFileName,
  useBlobPreview,
} from "@workspace/ui/components/file-preview"
import { notify } from "@workspace/ui/feedback/notify"
import {
  downloadMediaFile,
  fetchMediaBlob,
  getPrivateMediaContentUrl,
  getPrivateMediaDownloadUrl,
  getPrivateMediaPreviewUrl,
  listEntityFiles,
  mediaErrorReason,
  uploadFile,
  type MediaFile,
} from "@workspace/media"
import type { CaseAttachmentEntity } from "./types"

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

/** Above this size the drawer shows the file card + download instead of an
 * inline preview, keeping large documents out of browser memory. */
const MAX_INLINE_PREVIEW_BYTES = 25 * 1024 * 1024

/** Maps media failures to an actionable message. */
function describeMediaError(err: unknown, t: (key: string) => string) {
  switch (mediaErrorReason(err)) {
    case "org_required":
      return t("case_tabs.attachments.org_required")
    case "not_found":
      return t("case_tabs.attachments.file_missing")
    default:
      return translateApiError(err)
  }
}

/** Shared document table — entity attachments and staged (pre-case) uploads. */
function AttachmentRows({
  files,
  onRemove,
}: {
  files: MediaFile[]
  onRemove?: (publicId: string) => void
}) {
  const { t, formatDate } = useI18n()
  const { source, loading, show, openWithBlob, close } = useBlobPreview()

  const handleDownload = async (file: MediaFile) => {
    try {
      await downloadMediaFile(
        getPrivateMediaDownloadUrl(file.public_id),
        file.original_filename
      )
    } catch (error) {
      notify.error(
        t("case_tabs.attachments.download_error"),
        describeMediaError(error, t)
      )
    }
  }

  const handlePreview = async (file: MediaFile) => {
    const base = {
      filename: file.original_filename,
      mimeType: file.content_type,
      sizeBytes: file.size_bytes,
      title: file.original_filename,
      onDownload: () => {
        void handleDownload(file)
      },
    }
    // Private media needs the credentialed fetch (org scope); large files stay
    // as a file card so the browser does not hold them in memory.
    if (file.size_bytes > MAX_INLINE_PREVIEW_BYTES) {
      show(base)
      return
    }
    const category = detectFileCategory(
      file.original_filename,
      file.content_type
    )
    // Word documents convert to PDF server-side (Gotenberg); Excel stays
    // download-only because PDF pagination reads worse than the file itself.
    // Conversion failures degrade to the file card instead of blocking.
    if (category === "word") {
      try {
        await openWithBlob(
          () => fetchMediaBlob(getPrivateMediaPreviewUrl(file.public_id)),
          {
            ...base,
            filename: toPdfFileName(file.original_filename),
            mimeType: "application/pdf",
          },
          { pending: true }
        )
      } catch {
        show(base)
      }
      return
    }
    try {
      await openWithBlob(
        () => fetchMediaBlob(getPrivateMediaContentUrl(file.public_id)),
        base
      )
    } catch (error) {
      notify.error(
        t("case_tabs.attachments.open_error"),
        describeMediaError(error, t)
      )
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>{t("case_tabs.attachments.col_name")}</TableHead>
            <TableHead className="w-28">
              {t("case_tabs.attachments.col_size")}
            </TableHead>
            <TableHead className="w-44">
              {t("case_tabs.attachments.col_uploaded_at")}
            </TableHead>
            <TableHead className="w-32 text-right">
              {t("case_tabs.attachments.col_actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.public_id}>
              <TableCell>
                <FileText className="size-4 text-muted-foreground" />
              </TableCell>
              <TableCell className="max-w-0 truncate font-medium">
                {file.original_filename}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {formatSize(file.size_bytes)}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {formatDate(file.created_at)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  title={t("case_tabs.attachments.view")}
                  onClick={() => void handlePreview(file)}
                >
                  <Eye className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  title={t("case_tabs.attachments.download")}
                  onClick={() => void handleDownload(file)}
                >
                  <Download className="size-4" />
                </Button>
                {onRemove ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    title={t("case_tabs.attachments.remove")}
                    onClick={() => onRemove(file.public_id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <FilePreviewDrawer
        open={source !== null}
        onOpenChange={(open) => {
          if (!open) close()
        }}
        source={source}
        width="sm:max-w-3xl w-[92vw]"
        loading={loading}
      />
    </>
  )
}

function EmptyAttachments() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
      <Paperclip className="size-5" />
      {t("case_tabs.attachments.empty")}
    </div>
  )
}

/**
 * "Hồ sơ đính kèm" tab (EPAS `lib-task-process-file`): files attached to a
 * case or domain entity through media-service entity links. Uploads are
 * attached immediately (temp uploads would otherwise expire via the TTL
 * worker); the list is read-only for view-mode screens.
 */
export function CaseAttachmentsPanel({
  entity,
  entities,
  canUpload = true,
}: {
  entity?: CaseAttachmentEntity
  entities?: CaseAttachmentEntity[]
  canUpload?: boolean
}) {
  const { t } = useI18n()
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const targets = (entities ?? (entity ? [entity] : [])).filter(
    (item) => item.id
  )
  // Stable dependency for the fetch effect — the array itself is rebuilt on
  // every parent render (inline prop), so keys are the only safe trigger.
  const targetKey = targets.map((item) => `${item.type}:${item.id}`).join("|")
  const uploadTarget = targets[0]

  const load = useCallback(async () => {
    const list = targetKey
      ? targetKey.split("|").map((pair) => {
          const separator = pair.indexOf(":")
          return {
            type: pair.slice(0, separator),
            id: pair.slice(separator + 1),
          }
        })
      : []
    if (list.length === 0) return
    setLoading(true)
    try {
      // List every file attached to each owner (any origin module): staged
      // uploads from init screens are tagged with their own module (e.g.
      // "finance") and are attached after submit — the case panel must still
      // see them. `module` is the tag for new uploads only.
      const lists = await Promise.all(
        list.map((target) => listEntityFiles(target.type, target.id))
      )
      const merged = new Map<string, MediaFile>()
      for (const item of lists.flat()) merged.set(item.public_id, item)
      setFiles(
        [...merged.values()].sort((a, b) =>
          b.created_at.localeCompare(a.created_at)
        )
      )
    } catch (error) {
      notify.error(
        t("case_tabs.attachments.load_error"),
        error instanceof Error ? error.message : undefined
      )
    } finally {
      setLoading(false)
    }
  }, [targetKey, t])

  useEffect(() => {
    void load()
  }, [load])

  async function handleUpload(file: File) {
    if (!uploadTarget) return
    setUploading(true)
    try {
      await uploadFile(
        file,
        uploadTarget.module,
        uploadTarget.type,
        uploadTarget.id
      )
      await load()
    } catch (error) {
      notify.error(
        t("case_tabs.attachments.upload_error"),
        error instanceof Error ? error.message : undefined
      )
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">
          {t("case_tabs.attachments.list_title")}
        </CardTitle>
        {canUpload ? (
          <>
            <UploadButton
              uploading={uploading}
              onClick={() => fileInputRef.current?.click()}
            />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleUpload(file)
              }}
            />
          </>
        ) : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("case_tabs.attachments.loading")}
          </div>
        ) : files.length === 0 ? (
          <EmptyAttachments />
        ) : (
          <AttachmentRows files={files} />
        )}
      </CardContent>
    </Card>
  )
}

function UploadButton({
  uploading,
  onClick,
}: {
  uploading: boolean
  onClick: () => void
}) {
  const { t } = useI18n()
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={uploading}
      onClick={onClick}
    >
      {uploading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Upload className="size-4" />
      )}
      {uploading
        ? t("case_tabs.attachments.uploading")
        : t("case_tabs.attachments.upload")}
    </Button>
  )
}

/**
 * Staged variant for init screens (EPAS collects `taskProcessFiles` in the
 * form and sends them with the process start): files are uploaded to
 * media-service as temp records (no entity yet), listed locally, and attached
 * to `business_case`/caseId by the screen after the create call returns.
 */
export function StagedAttachmentsPanel({
  files,
  uploading,
  canUpload = true,
  onUpload,
  onRemove,
}: {
  files: MediaFile[]
  uploading: boolean
  canUpload?: boolean
  onUpload: (file: File) => void
  onRemove: (publicId: string) => void
}) {
  const { t } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-sm font-semibold">
            {t("case_tabs.attachments.list_title")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {t("case_tabs.attachments.staged_hint")}
          </p>
        </div>
        {canUpload ? (
          <>
            <UploadButton
              uploading={uploading}
              onClick={() => fileInputRef.current?.click()}
            />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onUpload(file)
                if (fileInputRef.current) fileInputRef.current.value = ""
              }}
            />
          </>
        ) : null}
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <EmptyAttachments />
        ) : (
          <AttachmentRows files={files} onRemove={onRemove} />
        )}
      </CardContent>
    </Card>
  )
}
