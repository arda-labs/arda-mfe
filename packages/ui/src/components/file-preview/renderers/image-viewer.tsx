import * as React from "react"
import { RotateCw, ZoomIn, ZoomOut } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

interface ImageViewerProps {
  src: string
  filename: string
  className?: string
}

export function ImageViewer({ src, filename, className }: ImageViewerProps) {
  const { t } = useI18n()
  const [zoom, setZoom] = React.useState(1)
  const [rotation, setRotation] = React.useState(0)

  const handleZoomIn = () =>
    setZoom((value) => Math.min(5, Math.round((value + 0.25) * 100) / 100))
  const handleZoomOut = () =>
    setZoom((value) => Math.max(0.2, Math.round((value - 0.25) * 100) / 100))
  const handleRotate = () => setRotation((value) => (value + 90) % 360)
  const handleReset = () => {
    setZoom(1)
    setRotation(0)
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border bg-card text-card-foreground",
        className
      )}
    >
      {/* Content-level controls only; file actions live in the preview header. */}
      <div className="flex shrink-0 items-center justify-end gap-1.5 border-b bg-muted/40 px-3 py-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handleZoomOut}
          disabled={zoom <= 0.25}
          title={t("preview.zoom_out")}
        >
          <ZoomOut className="size-3.5" />
        </Button>
        <button
          type="button"
          onClick={handleReset}
          className="cursor-pointer rounded px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
          title={t("preview.reset_zoom")}
        >
          {Math.round(zoom * 100)}%
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handleZoomIn}
          disabled={zoom >= 5}
          title={t("preview.zoom_in")}
        >
          <ZoomIn className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handleRotate}
          title={t("preview.rotate")}
        >
          <RotateCw className="size-3.5" />
        </Button>
      </div>

      {/* Image Container with Checkered Background */}
      <div className="flex flex-1 items-center justify-center overflow-auto bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] p-6 dark:bg-[radial-gradient(#334155_1px,transparent_1px)]">
        <div
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: "transform 0.15s ease-out",
          }}
          className="flex max-h-full max-w-full items-center justify-center"
        >
          <img
            src={src}
            alt={filename}
            className="max-h-[65vh] max-w-full rounded border object-contain shadow-md"
          />
        </div>
      </div>
    </div>
  )
}
