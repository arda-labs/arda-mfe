import * as React from "react"
import { Download, ExternalLink, Eye, Printer, X } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { Dialog, DialogContent } from "@workspace/ui/components/dialog"
import { cn } from "@workspace/ui/lib/utils"
import { FilePreviewContent } from "./file-preview-content"
import {
  detectFileCategory,
  formatFileSize,
  type FilePreviewSource,
} from "./file-preview-types"
import { PreviewControlsProvider } from "./preview-toolbar"
import { printPreviewSource } from "./print-source"

export interface FilePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: FilePreviewSource | null
  /** Replaces the body with a spinner while the preview is being prepared. */
  loading?: boolean
}

/**
 * Full-screen preview with exactly one header: file identity + file actions +
 * the active renderer's controls (page nav, zoom, rotate, ...). Renderers must
 * not render their own top bar.
 */
export function FilePreviewDialog({
  open,
  onOpenChange,
  source,
  loading = false,
}: FilePreviewDialogProps) {
  const { t } = useI18n()
  const [controlsTarget, setControlsTarget] =
    React.useState<HTMLDivElement | null>(null)

  if (!source) return null

  const category = detectFileCategory(source.filename, source.mimeType)
  // Office files are converted server-side before the first byte arrives; the
  // pending source has no `src` yet, which distinguishes conversion from a
  // regular document load.
  const converting = loading && !source.src

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
        style={{ maxHeight: "none" }}
        className="inset-0 top-0 left-0 h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-0 p-0 sm:rounded-none"
      >
        {/* Single header: identity, renderer controls, file actions. */}
        <div className="flex shrink-0 items-center gap-3 border-b bg-muted/30 px-4 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Eye className="size-3.5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm leading-tight font-semibold">
                {source.title || source.filename}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground uppercase">
                  {category}
                </span>
                {source.sizeBytes ? (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {formatFileSize(source.sizeBytes)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div
            ref={setControlsTarget}
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
          />

          <div className="flex shrink-0 items-center gap-1">
            {category === "pdf" && source.src ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => printPreviewSource(source.src as string)}
                title={t("preview.print")}
              >
                <Printer className="size-3.5" />
              </Button>
            ) : null}

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
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs font-medium"
              onClick={handleDownload}
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">{t("preview.download")}</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
              title={t("action.close")}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-hidden bg-muted/20 p-3">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Spinner className="size-8 text-primary" />
              <p className="font-mono text-xs text-muted-foreground">
                {converting ? t("preview.converting") : t("preview.loading")}
              </p>
              {converting ? (
                <p className="max-w-md text-center text-xs text-muted-foreground">
                  {t("preview.converting_hint")}
                </p>
              ) : null}
            </div>
          ) : (
            <PreviewControlsProvider target={controlsTarget}>
              <FilePreviewContent source={source} className={cn("h-full")} />
            </PreviewControlsProvider>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
