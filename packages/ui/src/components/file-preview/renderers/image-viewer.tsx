import * as React from "react"
import { Download, ImageIcon, RotateCw, ZoomIn, ZoomOut } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

interface ImageViewerProps {
  src: string
  filename: string
  onDownload?: () => void
  className?: string
}

export function ImageViewer({ src, filename, onDownload, className }: ImageViewerProps) {
  const { t } = useI18n()
  const [zoom, setZoom] = React.useState(1)
  const [rotation, setRotation] = React.useState(0)

  const handleZoomIn = () => setZoom((z) => Math.min(5, Math.round((z + 0.25) * 100) / 100))
  const handleZoomOut = () => setZoom((z) => Math.max(0.2, Math.round((z - 0.25) * 100) / 100))
  const handleRotate = () => setRotation((r) => (r + 90) % 360)
  const handleReset = () => {
    setZoom(1)
    setRotation(0)
  }

  return (
    <div className={cn("flex flex-col h-full overflow-hidden border rounded-lg bg-card text-card-foreground", className)}>
      {/* Image Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 font-mono text-[11px]">
            <ImageIcon className="size-3 text-sky-500" />
            IMAGE
          </Badge>
          <span className="text-xs text-muted-foreground font-medium truncate max-w-xs">
            {filename}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleZoomOut}
            disabled={zoom <= 0.25}
            title="Thu nhỏ (-25%)"
          >
            <ZoomOut className="size-3.5" />
          </Button>

          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] font-mono px-1.5 py-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            title="Đặt lại kích thước (100%)"
          >
            {Math.round(zoom * 100)}%
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleZoomIn}
            disabled={zoom >= 5}
            title="Phóng to (+25%)"
          >
            <ZoomIn className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleRotate}
            title="Xoay 90 độ"
          >
            <RotateCw className="size-3.5" />
          </Button>

          {onDownload && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs ml-1"
              onClick={onDownload}
            >
              <Download className="size-3.5 mr-1" />
              {t("preview.download")}
            </Button>
          )}
        </div>
      </div>

      {/* Image Container with Checkered Background */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]">
        <div
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: "transform 0.15s ease-out",
          }}
          className="flex items-center justify-center max-w-full max-h-full"
        >
          <img
            src={src}
            alt={filename}
            className="max-h-[65vh] max-w-full object-contain rounded shadow-md border"
          />
        </div>
      </div>
    </div>
  )
}
