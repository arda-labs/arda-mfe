import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  MoveHorizontal,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
} from "pdfjs-dist"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"

interface PdfViewerProps {
  src: string
  filename: string
  className?: string
}

const MIN_ZOOM = 0.25
const MAX_ZOOM = 4
const ZOOM_STEP = 0.25
const PAGE_GAP_PX = 24

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100))
}

/**
 * PDF.js-based viewer with our own toolbar: page navigation, zoom, fit-width
 * and rotate live here, while file-level actions (download, open in new tab,
 * print, fullscreen) belong to the surrounding preview header. PDF.js is
 * imported lazily so it never lands on the boot/page bundles.
 */
export function PdfViewer({ src, filename, className }: PdfViewerProps) {
  const { t } = useI18n()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const pageRefs = React.useRef(new Map<number, HTMLDivElement>())
  const [doc, setDoc] = React.useState<PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = React.useState(0)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [zoom, setZoom] = React.useState(1)
  const [fitWidth, setFitWidth] = React.useState(true)
  const [rotation, setRotation] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    let loadingTask: PDFDocumentLoadingTask | null = null
    setLoading(true)
    setError(null)
    setDoc(null)
    setPageCount(0)
    setCurrentPage(1)
    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist")
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default
        loadingTask = pdfjs.getDocument({ url: src })
        const pdf = await loadingTask.promise
        if (cancelled) return
        setDoc(pdf)
        setPageCount(pdf.numPages)
        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
      void loadingTask?.destroy()
    }
  }, [src])

  const fitToWidth = React.useCallback(async () => {
    if (!doc || !containerRef.current) return
    const page = await doc.getPage(1)
    const viewport = page.getViewport({ scale: 1, rotation })
    const available = containerRef.current.clientWidth - PAGE_GAP_PX
    if (available > 0) setZoom(clampZoom(available / viewport.width))
  }, [doc, rotation])

  React.useEffect(() => {
    if (fitWidth && doc) void fitToWidth()
  }, [fitWidth, doc, fitToWidth])

  React.useEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => {
      if (fitWidth) void fitToWidth()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [fitWidth, fitToWidth])

  const registerRef = React.useCallback(
    (page: number, node: HTMLDivElement | null) => {
      if (node) pageRefs.current.set(page, node)
      else pageRefs.current.delete(page)
    },
    []
  )

  const handleVisible = React.useCallback((page: number) => {
    setCurrentPage((current) => (current === page ? current : page))
  }, [])

  const goToPage = (page: number) => {
    const target = Math.min(pageCount, Math.max(1, page))
    setCurrentPage(target)
    pageRefs.current
      .get(target)
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const manualZoom = (next: number) => {
    setFitWidth(false)
    setZoom(clampZoom(next))
  }

  if (error) {
    // Some sources (external hosts without CORS) cannot be fetched by PDF.js;
    // fall back to the browser's native viewer instead of a dead end.
    return (
      <div
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-lg border bg-card",
          className
        )}
      >
        <iframe src={src} title={filename} className="h-full w-full border-0" />
      </div>
    )
  }

  if (loading || !doc) {
    return (
      <div
        className={cn(
          "flex h-full flex-col items-center justify-center gap-3 rounded-lg border bg-card",
          className
        )}
      >
        <Spinner className="size-8 text-primary" />
        <p className="font-mono text-xs text-muted-foreground">
          {t("preview.loading")}
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border bg-card",
        className
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-muted/40 px-3 py-1.5">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
            title={t("preview.prev_page")}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="min-w-20 text-center font-mono text-[11px] text-muted-foreground">
            {t("preview.page_of", {
              current: currentPage,
              total: pageCount,
            })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={currentPage >= pageCount}
            onClick={() => goToPage(currentPage + 1)}
            title={t("preview.next_page")}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => manualZoom(zoom - ZOOM_STEP)}
            title={t("preview.zoom_out")}
          >
            <ZoomOut className="size-3.5" />
          </Button>
          <button
            type="button"
            onClick={() => void fitToWidth()}
            className="cursor-pointer rounded px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
            title={t("preview.reset_zoom")}
          >
            {Math.round(zoom * 100)}%
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => manualZoom(zoom + ZOOM_STEP)}
            title={t("preview.zoom_in")}
          >
            <ZoomIn className="size-3.5" />
          </Button>
          <Button
            variant={fitWidth ? "secondary" : "ghost"}
            size="icon"
            className="size-7"
            onClick={() => setFitWidth((value) => !value)}
            title={t("preview.fit_width")}
          >
            <MoveHorizontal className="size-3.5" />
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
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-muted/30 px-2 py-1"
        aria-label={filename}
      >
        {Array.from({ length: pageCount }, (_, index) => (
          <PdfPage
            key={index + 1}
            doc={doc}
            pageNumber={index + 1}
            scale={zoom}
            rotation={rotation}
            registerRef={registerRef}
            onVisible={handleVisible}
          />
        ))}
      </div>
    </div>
  )
}

function PdfPage({
  doc,
  pageNumber,
  scale,
  rotation,
  registerRef,
  onVisible,
}: {
  doc: PDFDocumentProxy
  pageNumber: number
  scale: number
  rotation: number
  registerRef: (page: number, node: HTMLDivElement | null) => void
  onVisible: (page: number) => void
}) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const [visible, setVisible] = React.useState(false)
  const [size, setSize] = React.useState<{
    width: number
    height: number
  } | null>(null)

  React.useEffect(() => {
    const el = wrapperRef.current
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            onVisible(pageNumber)
          }
        }
      },
      { rootMargin: "800px 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [pageNumber, onVisible])

  React.useEffect(() => {
    if (!visible) return
    let cancelled = false
    let task: ReturnType<PDFPageProxy["render"]> | null = null
    void (async () => {
      const page = await doc.getPage(pageNumber)
      if (cancelled) return
      const viewport = page.getViewport({ scale, rotation })
      const canvas = canvasRef.current
      if (!canvas) return
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.floor(viewport.width)
      const height = Math.floor(viewport.height)
      canvas.width = Math.floor(width * ratio)
      canvas.height = Math.floor(height * ratio)
      const context = canvas.getContext("2d")
      if (!context) return
      setSize({ width, height })
      task = page.render({
        canvas,
        viewport,
        transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
      })
      try {
        await task.promise
      } catch {
        // Rendering is cancelled when zoom/rotation changes; ignore.
      }
    })()
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [doc, pageNumber, scale, rotation, visible])

  return (
    <div
      ref={(node) => {
        wrapperRef.current = node
        registerRef(pageNumber, node)
      }}
      className="mx-auto my-3 bg-white shadow-sm ring-1 ring-black/5"
      style={size ? { width: size.width, height: size.height } : undefined}
    >
      <canvas
        ref={canvasRef}
        className="block"
        style={size ? { width: size.width, height: size.height } : undefined}
      />
    </div>
  )
}
