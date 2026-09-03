import { useRef, useState, type DragEvent, type ChangeEvent } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { FileText, UploadCloud, X, CheckCircle2, AlertCircle } from "lucide-react"

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".doc", ".md", ".txt"]
const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(",")

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUploadZone({
  file,
  onFileSelect,
  onFileRemove,
  uploading = false,
  error = null,
}: {
  file: File | null
  onFileSelect: (file: File) => void
  onFileRemove: () => void
  uploading?: boolean
  error?: string | null
}) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      onFileSelect(droppedFile)
    }
  }

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      onFileSelect(selectedFile)
    }
    // reset input value so re-selecting the same file fires onChange
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  if (file) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 text-xs">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileText className="size-4" />
          </div>
          <div className="flex flex-col truncate">
            <span className="truncate font-medium">{file.name}</span>
            <span className="text-[11px] text-muted-foreground">
              {formatBytes(file.size)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {uploading ? (
            <span className="text-[11px] text-muted-foreground animate-pulse">
              {t("ai.knowledge.upload.processing")}
            </span>
          ) : error ? (
            <span className="flex items-center gap-1 text-[11px] text-destructive">
              <AlertCircle className="size-3" />
              {error}
            </span>
          ) : (
            <CheckCircle2 className="size-4 text-emerald-600" />
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-foreground"
            disabled={uploading}
            onClick={onFileRemove}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={handleFileInput}
      />
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <UploadCloud className="size-5" />
      </div>
      <div>
        <p className="text-xs font-medium">
          {t("ai.knowledge.upload.drop_title")}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {t("ai.knowledge.upload.supported_formats")} (PDF, DOCX, MD, TXT)
        </p>
      </div>
    </div>
  )
}
