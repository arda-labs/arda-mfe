import * as React from "react"
import { Download, ExternalLink, Eye, Maximize2, Minimize2, X } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
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
}

export function FilePreviewDialog({ open, onOpenChange, source }: FilePreviewDialogProps) {
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
        className={cn(
          "flex flex-col p-0 gap-0 overflow-hidden transition-all duration-200",
          fullscreen
            ? "fixed inset-2 max-w-none w-[calc(100vw-16px)] h-[calc(100vh-16px)] rounded-xl"
            : "sm:max-w-4xl w-[92vw] h-[82vh] rounded-xl"
        )}
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between border-b px-4 py-2.5 bg-muted/30 shrink-0 space-y-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Eye className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm font-semibold truncate leading-none">
                {source.title || source.filename}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px] uppercase font-mono px-1.5 py-0 h-4">
                  {category}
                </Badge>
                {source.sizeBytes ? (
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {formatFileSize(source.sizeBytes)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {source.src ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={handleOpenNewTab}
                title="Mở trong tab mới"
              >
                <ExternalLink className="size-3.5" />
              </Button>
            ) : null}

            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setFullscreen(!fullscreen)}
              title={fullscreen ? "Thu nhỏ" : "Toàn màn hình"}
            >
              {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs gap-1.5 font-medium ml-1"
              onClick={handleDownload}
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Tải về</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground ml-1"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden p-3 bg-muted/10">
          <FilePreviewContent source={source} className="h-full" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
