import * as React from "react"
import {
  Download,
  ExternalLink,
  Eye,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { cn } from "@workspace/ui/lib/utils"
import { FilePreviewContent } from "./file-preview-content"
import {
  detectFileCategory,
  formatFileSize,
  type FilePreviewSource,
} from "./file-preview-types"

export interface FilePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: FilePreviewSource | null
  /** Replaces the body with a spinner while the preview is being prepared. */
  loading?: boolean
}

export function FilePreviewDialog({
  open,
  onOpenChange,
  source,
  loading = false,
}: FilePreviewDialogProps) {
  const { t } = useI18n()
  const [fullscreen, setFullscreen] = React.useState(false)

  if (!source) return null

  const category = detectFileCategory(source.filename, source.mimeType)

  const handleDownload = () => {
    if (source.onDownload) {
      source.onDownload()
    } else if (source.src) {
      window.open(source.src, "_blank")
    }
  }

  const handleOpenNewTab = () => {
    if (source.src) {
      window.open(source.src, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0 transition-all duration-200",
          fullscreen
            ? "fixed inset-2 h-[calc(100vh-16px)] w-[calc(100vw-16px)] max-w-none translate-x-0 translate-y-0 rounded-xl"
            : "h-[82vh] w-[92vw] rounded-xl sm:max-w-4xl"
        )}
      >
        {/* Header */}
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 border-b bg-muted/30 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5 pr-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Eye className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-sm leading-none font-semibold">
                {source.title || source.filename}
              </DialogTitle>
              <div className="mt-1 flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="h-4 px-1.5 py-0 font-mono text-[10px] uppercase"
                >
                  {category}
                </Badge>
                {source.sizeBytes ? (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {formatFileSize(source.sizeBytes)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {source.src ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={handleOpenNewTab}
                title={t("preview.open_new_tab")}
              >
                <ExternalLink className="size-3.5" />
              </Button>
            ) : null}

            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setFullscreen(!fullscreen)}
              title={
                fullscreen ? t("preview.minimize") : t("preview.fullscreen")
              }
            >
              {fullscreen ? (
                <Minimize2 className="size-3.5" />
              ) : (
                <Maximize2 className="size-3.5" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="ml-1 h-7 gap-1.5 px-2.5 text-xs font-medium"
              onClick={handleDownload}
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">{t("preview.download")}</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="ml-1 size-7 text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
              title={t("action.close")}
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden bg-muted/10 p-3">
          {loading ? (
            <div className="flex h-full min-h-[350px] flex-col items-center justify-center gap-3">
              <Spinner className="size-8 text-primary" />
              <p className="font-mono text-xs text-muted-foreground">
                {t("preview.loading")}
              </p>
            </div>
          ) : (
            <FilePreviewContent source={source} className="h-full" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
