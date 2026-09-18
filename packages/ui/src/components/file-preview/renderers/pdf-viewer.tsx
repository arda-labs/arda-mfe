import * as React from "react"
import { createPortal } from "react-dom"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  MoveHorizontal,
  RotateCw,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
  TextLayer,
} from "pdfjs-dist"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"
import { usePreviewControlsTarget } from "../preview-toolbar"

type PdfLibrary = typeof import("pdfjs-dist")

interface PdfViewerProps {
  src: string
  filename: string
  className?: string
}

interface PdfSearchMatch {
  page: number
  occurrence: number
  snippet: string
}

interface HighlightLike {
  add: (range: Range) => void
}

type HighlightCtor = new (...ranges: Range[]) => HighlightLike

const MIN_ZOOM = 0.25
const MAX_ZOOM = 4
const ZOOM_STEP = 0.25
const WHEEL_ZOOM_FACTOR = 1.1
const PAGE_GAP_PX = 24
const SEARCH_DEBOUNCE_MS = 250

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100))
}

/** Minimal Highlight API access (lib.dom types vary across TS versions). */
function highlightsRegistry(): Map<string, unknown> | null {
  const css = globalThis.CSS as unknown as
    { highlights?: Map<string, unknown> } | undefined
  return css?.highlights ?? null
}

function highlightCtor(): HighlightCtor | null {
  return (globalThis as { Highlight?: HighlightCtor }).Highlight ?? null
}

/**
 * PDF.js viewer: controls (page nav, zoom, fit-width, rotate, search) are
 * portaled into the single preview header. PDF.js is imported lazily so it
 * never lands on the boot/page bundles. The text layer enables selection/copy
 * and in-document search; Ctrl+wheel zooms like the native viewer.
 */
export function PdfViewer({ src, filename, className }: PdfViewerProps) {
  const { t } = useI18n()
  const controlsTarget = usePreviewControlsTarget()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const pageRefs = React.useRef(new Map<number, HTMLDivElement>())
  const highlightRaf = React.useRef(0)
  const searchSeq = React.useRef(0)
  const lastScrolledMatch = React.useRef(-1)
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const [pdfjs, setPdfjs] = React.useState<PdfLibrary | null>(null)
  const [doc, setDoc] = React.useState<PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = React.useState(0)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [zoom, setZoom] = React.useState(1)
  const [fitWidth, setFitWidth] = React.useState(true)
  const [rotation, setRotation] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [matches, setMatches] = React.useState<PdfSearchMatch[]>([])
  const [activeMatch, setActiveMatch] = React.useState(-1)
  const [renderTick, setRenderTick] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    let loadingTask: PDFDocumentLoadingTask | null = null
    setLoading(true)
    setError(null)
    setDoc(null)
    setPageCount(0)
    setCurrentPage(1)
    setMatches([])
    setActiveMatch(-1)
    setSearchQuery("")
    void (async () => {
      try {
        const module = await import("pdfjs-dist")
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
        module.GlobalWorkerOptions.workerSrc = worker.default
        loadingTask = module.getDocument({ url: src })
        const pdf = await loadingTask.promise
        if (cancelled) return
        setPdfjs(module)
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

  // Ctrl+wheel (and trackpad pinch) zooms the document, not the page.
  React.useEffect(() => {
    const el = containerRef.current
    if (!el || !doc) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      setFitWidth(false)
      setZoom((value) =>
        clampZoom(
          value * (event.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR)
        )
      )
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [doc])

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

  const requestHighlightRefresh = React.useCallback(() => {
    if (highlightRaf.current) return
    highlightRaf.current = requestAnimationFrame(() => {
      highlightRaf.current = 0
      setRenderTick((value) => value + 1)
    })
  }, [])

  React.useEffect(() => {
    return () => {
      if (highlightRaf.current) cancelAnimationFrame(highlightRaf.current)
    }
  }, [])

  const goToPage = React.useCallback(
    (page: number) => {
      const target = Math.min(pageCount, Math.max(1, page))
      setCurrentPage(target)
      pageRefs.current
        .get(target)
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    },
    [pageCount]
  )

  const manualZoom = (next: number) => {
    setFitWidth(false)
    setZoom(clampZoom(next))
  }

  // Whole-document search over the extracted text so results do not depend on
  // which pages happen to be rendered yet.
  React.useEffect(() => {
    const query = searchQuery.trim()
    if (!doc || !query) {
      setMatches([])
      setActiveMatch(-1)
      lastScrolledMatch.current = -1
      return
    }
    const sequence = ++searchSeq.current
    const timer = window.setTimeout(() => {
      void (async () => {
        const found: PdfSearchMatch[] = []
        const needle = query.toLowerCase()
        for (let page = 1; page <= pageCount; page++) {
          const pdfPage = await doc.getPage(page)
          const content = await pdfPage.getTextContent()
          const text = content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join("")
          const haystack = text.toLowerCase()
          let occurrence = 0
          let from = 0
          while (true) {
            const index = haystack.indexOf(needle, from)
            if (index < 0) break
            found.push({
              page,
              occurrence,
              snippet: text.slice(
                Math.max(0, index - 24),
                index + query.length + 24
              ),
            })
            occurrence++
            from = index + needle.length
          }
          if (sequence !== searchSeq.current) return
        }
        if (sequence !== searchSeq.current) return
        setMatches(found)
        lastScrolledMatch.current = -1
        setActiveMatch(found.length > 0 ? 0 : -1)
        if (found.length > 0) goToPage(found[0].page)
      })()
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [doc, pageCount, searchQuery, goToPage])

  const goToMatch = React.useCallback(
    (index: number) => {
      if (matches.length === 0) return
      const next = (index + matches.length) % matches.length
      setActiveMatch(next)
      goToPage(matches[next].page)
    },
    [matches, goToPage]
  )

  // Ctrl/Cmd+F opens in-document search; Escape closes it.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && key === "f") {
        event.preventDefault()
        setSearchOpen(true)
        window.setTimeout(() => searchInputRef.current?.focus(), 0)
        return
      }
      if (key === "escape" && searchOpen) {
        setSearchOpen(false)
        setSearchQuery("")
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [searchOpen])

  // Paint search hits with the CSS Custom Highlight API: no DOM mutation, so
  // PDF.js keeps owning the text layer and highlights survive re-renders.
  React.useEffect(() => {
    const registry = highlightsRegistry()
    const Highlight = highlightCtor()
    const container = containerRef.current
    if (!registry || !Highlight || !container) return

    const all = new Highlight()
    let activeRange: Range | null = null
    const query = searchQuery.trim().toLowerCase()

    if (query) {
      const pages = container.querySelectorAll<HTMLElement>("[data-pdf-page]")
      pages.forEach((pageEl) => {
        const pageNumber = Number(pageEl.dataset.pdfPage)
        const nodes: Text[] = []
        const walker = document.createTreeWalker(pageEl, NodeFilter.SHOW_TEXT)
        let text = ""
        while (walker.nextNode()) {
          const node = walker.currentNode as Text
          nodes.push(node)
          text += node.data
        }
        const haystack = text.toLowerCase()
        let occurrence = 0
        let from = 0
        while (from <= haystack.length) {
          const index = haystack.indexOf(query, from)
          if (index < 0) break
          const range = buildRange(nodes, index, index + query.length)
          if (range) {
            all.add(range)
            const match = matches[activeMatch]
            if (
              match &&
              match.page === pageNumber &&
              match.occurrence === occurrence
            ) {
              activeRange = range
            }
          }
          occurrence++
          from = index + query.length
        }
      })
    }

    registry.set("arda-pdf-search", all)
    const active = new Highlight()
    if (activeRange) active.add(activeRange)
    registry.set("arda-pdf-search-active", active)

    if (activeRange && lastScrolledMatch.current !== activeMatch) {
      lastScrolledMatch.current = activeMatch
      const rect = (activeRange as Range).getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      container.scrollBy({
        top: rect.top - containerRect.top - container.clientHeight / 3,
        behavior: "smooth",
      })
    }
  }, [renderTick, searchQuery, activeMatch, matches])

  const controls = (
    <>
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
      <span className="min-w-16 text-center font-mono text-[11px] text-muted-foreground">
        {t("preview.page_of", { current: currentPage, total: pageCount })}
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

      <span className="mx-1 h-4 w-px bg-border" />

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

      <span className="mx-1 h-4 w-px bg-border" />

      {searchOpen ? (
        <div className="flex items-center gap-0.5 rounded-md border bg-background px-1.5">
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                goToMatch(activeMatch + (event.shiftKey ? -1 : 1))
              }
            }}
            placeholder={t("preview.search_in_pdf")}
            className="h-6 w-44 border-0 px-0 text-xs shadow-none focus-visible:ring-0"
            spellCheck={false}
          />
          <span className="min-w-12 text-center font-mono text-[11px] text-muted-foreground">
            {searchQuery.trim()
              ? matches.length === 0
                ? t("preview.search_no_matches")
                : `${activeMatch + 1}/${matches.length}`
              : ""}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={matches.length === 0}
            onClick={() => goToMatch(activeMatch - 1)}
            title={t("preview.search_prev")}
          >
            <ChevronUp className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={matches.length === 0}
            onClick={() => goToMatch(activeMatch + 1)}
            title={t("preview.search_next")}
          >
            <ChevronDown className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => {
              setSearchOpen(false)
              setSearchQuery("")
            }}
            title={t("preview.search_close")}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => {
            setSearchOpen(true)
            window.setTimeout(() => searchInputRef.current?.focus(), 0)
          }}
          title={t("preview.search_find")}
        >
          <Search className="size-3.5" />
        </Button>
      )}
    </>
  )

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

  if (loading || !doc || !pdfjs) {
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
    <div className={cn("h-full", className)} aria-label={filename}>
      {controlsTarget ? createPortal(controls, controlsTarget) : null}
      <div
        ref={containerRef}
        className="h-full overflow-auto rounded-lg border bg-muted/30 px-2 py-1"
      >
        {Array.from({ length: pageCount }, (_, index) => (
          <PdfPage
            key={index + 1}
            pdfjs={pdfjs}
            doc={doc}
            pageNumber={index + 1}
            scale={zoom}
            rotation={rotation}
            registerRef={registerRef}
            onVisible={handleVisible}
            onRendered={requestHighlightRefresh}
          />
        ))}
      </div>
    </div>
  )
}

/** Maps absolute character offsets onto text nodes inside a page. */
function buildRange(nodes: Text[], start: number, end: number): Range | null {
  let offset = 0
  let startNode: Text | null = null
  let startOffset = 0
  let endNode: Text | null = null
  let endOffset = 0
  for (const node of nodes) {
    const next = offset + node.data.length
    if (!startNode && start >= offset && start <= next) {
      startNode = node
      startOffset = start - offset
    }
    if (!endNode && end >= offset && end <= next) {
      endNode = node
      endOffset = end - offset
      break
    }
    offset = next
  }
  if (!startNode || !endNode) return null
  try {
    const range = document.createRange()
    range.setStart(startNode, startOffset)
    range.setEnd(endNode, endOffset)
    return range
  } catch {
    return null
  }
}

function PdfPage({
  pdfjs,
  doc,
  pageNumber,
  scale,
  rotation,
  registerRef,
  onVisible,
  onRendered,
}: {
  pdfjs: PdfLibrary
  doc: PDFDocumentProxy
  pageNumber: number
  scale: number
  rotation: number
  registerRef: (page: number, node: HTMLDivElement | null) => void
  onVisible: (page: number) => void
  onRendered: () => void
}) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const textLayerRef = React.useRef<HTMLDivElement | null>(null)
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
    let renderTask: ReturnType<PDFPageProxy["render"]> | null = null
    let textLayer: TextLayer | null = null
    void (async () => {
      const page = await doc.getPage(pageNumber)
      if (cancelled) return
      const viewport = page.getViewport({ scale, rotation })
      const canvas = canvasRef.current
      const textContainer = textLayerRef.current
      if (!canvas) return
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.floor(viewport.width)
      const height = Math.floor(viewport.height)
      canvas.width = Math.floor(width * ratio)
      canvas.height = Math.floor(height * ratio)
      const context = canvas.getContext("2d")
      if (!context) return
      setSize({ width, height })
      renderTask = page.render({
        canvas,
        viewport,
        transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
      })
      try {
        await renderTask.promise
      } catch {
        // Rendering is cancelled when zoom/rotation changes; ignore.
        return
      }
      if (cancelled || !textContainer) return
      textContainer.replaceChildren()
      textContainer.style.setProperty("--scale-factor", String(scale))
      textLayer = new pdfjs.TextLayer({
        textContentSource: await page.streamTextContent(),
        container: textContainer,
        viewport,
      })
      try {
        await textLayer.render()
      } catch {
        // Text layer is best-effort; the canvas already rendered.
      }
      if (!cancelled) onRendered()
    })()
    return () => {
      cancelled = true
      renderTask?.cancel()
      textLayer?.cancel()
    }
  }, [pdfjs, doc, pageNumber, scale, rotation, visible, onRendered])

  return (
    <div
      ref={(node) => {
        wrapperRef.current = node
        registerRef(pageNumber, node)
      }}
      data-pdf-page={pageNumber}
      className="relative mx-auto my-3 bg-white shadow-sm ring-1 ring-black/5"
      style={
        size ? { width: size.width, height: size.height } : { minHeight: 480 }
      }
    >
      <canvas
        ref={canvasRef}
        className="block"
        style={size ? { width: size.width, height: size.height } : undefined}
      />
      <div ref={textLayerRef} className="pdf-text-layer" />
    </div>
  )
}
