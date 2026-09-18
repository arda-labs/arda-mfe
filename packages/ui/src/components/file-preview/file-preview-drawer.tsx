import { Download, ExternalLink, Eye, X } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { FilePreviewContent } from "./file-preview-content"
import {
  detectFileCategory,
  formatFileSize,
  type FilePreviewSource,
} from "./file-preview-types"

export interface FilePreviewDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: FilePreviewSource | null
  width?: string
  /** Replaces the body with a spinner while the preview is being prepared. */
  loading?: boolean
}

export function FilePreviewDrawer({
  open,
  onOpenChange,
  source,
  width = "sm:max-w-2xl w-[90vw]",
  loading = false,
}: FilePreviewDrawerProps) {
  const { t } = useI18n()
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={`flex flex-col gap-0 overflow-hidden p-0 ${width}`}
      >
        {/* Drawer Header */}
        <SheetHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 border-b bg-muted/30 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5 pr-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Eye className="size-4" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate text-sm leading-none font-semibold">
                {source.title || source.filename}
              </SheetTitle>
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
        </SheetHeader>

        {/* Drawer Content */}
        <div className="flex-1 overflow-hidden bg-muted/10 p-4">
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
      </SheetContent>
    </Sheet>
  )
}
