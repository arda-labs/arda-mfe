import * as React from "react"
import { createPortal } from "react-dom"
import { RotateCw, ZoomIn, ZoomOut } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { usePreviewControlsTarget } from "../preview-toolbar"

interface ImageViewerProps {
  src: string
  filename: string
  className?: string
}

const MIN_ZOOM = 0.2
const MAX_ZOOM = 5
const ZOOM_STEP = 0.25
const WHEEL_ZOOM_FACTOR = 1.1

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100))
}

/**
 * Image renderer. Zoom/rotate controls are portaled into the single preview
 * header; Ctrl+wheel zooms like the native PDF viewer.
 */
export function ImageViewer({ src, filename, className }: ImageViewerProps) {
  const { t } = useI18n()
  const controlsTarget = usePreviewControlsTarget()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = React.useState(1)
  const [rotation, setRotation] = React.useState(0)

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      setZoom((value) =>
        clampZoom(
          value * (event.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR)
        )
      )
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  const controls = (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={() => setZoom((value) => clampZoom(value - ZOOM_STEP))}
        disabled={zoom <= MIN_ZOOM}
        title={t("preview.zoom_out")}
      >
        <ZoomOut className="size-3.5" />
      </Button>
      <button
        type="button"
        onClick={() => {
          setZoom(1)
          setRotation(0)
        }}
        className="cursor-pointer rounded px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
        title={t("preview.reset_zoom")}
      >
        {Math.round(zoom * 100)}%
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={() => setZoom((value) => clampZoom(value + ZOOM_STEP))}
        disabled={zoom >= MAX_ZOOM}
        title={t("preview.zoom_in")}
      >
        <ZoomIn className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={() => setRotation((value) => (value + 90) % 360)}
        title={t("preview.rotate")}
      >
        <RotateCw className="size-3.5" />
      </Button>
    </>
  )

  return (
    <div className={cn("h-full", className)} aria-label={filename}>
      {controlsTarget ? createPortal(controls, controlsTarget) : null}
      <div
        ref={containerRef}
        className="flex h-full items-center justify-center overflow-auto rounded-lg border bg-card bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] p-6 dark:bg-[radial-gradient(#334155_1px,transparent_1px)]"
      >
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
