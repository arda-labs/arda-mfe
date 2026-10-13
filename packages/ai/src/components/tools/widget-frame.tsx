import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { AlertTriangle, Maximize2, Minimize2, Sparkles } from "lucide-react"
import { observeThemeChange, readChartThemeFromDocument } from "../../lib/chart-theme"
import { sameChartTheme, shouldApplyHeight, WidgetSlotRegistry } from "../../lib/widget-frame-logic"
import { buildWidgetDocument, type WidgetSource } from "../../lib/widget-host"
import {
  WIDGET_MAX_MOUNTED,
  WIDGET_TIMEOUT_MS,
  clampWidgetHeight,
  parseWidgetMessage,
} from "../../lib/widget-protocol"

type Phase = "loading" | "live" | "timeout"

// Display cap for arda:error text. It comes from model code (untrusted); the
// parser already caps it at 500 chars, the bar is a single truncated line.
const ERROR_DISPLAY_CHARS = 200

type WidgetFrameProps = {
  title: string
  source: WidgetSource
  data: unknown
  inputsSummary: string
  className?: string
}

// Mounts one model-generated widget. The iframe has an opaque origin
// (sandbox without allow-same-origin): no cookies, storage or parent DOM.
// Data goes in once via postMessage; only height and error come back.
//
// The iframe element is the same in every state (expand is an in-place height
// change), and is only recreated through `generation`: theme flip, changed
// source, or a retry/reload button.
export function WidgetFrame({ title, source, data, inputsSummary, className }: WidgetFrameProps) {
  const { t } = useI18n()
  const { html, css, js } = source
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const dataRef = useRef(data)
  const timerRef = useRef<number | null>(null)
  const appliedHeightRef = useRef(clampWidgetHeight(0))

  const [theme, setTheme] = useState(readChartThemeFromDocument)
  // Keyed on content, not on the `source` object: the parent may recreate it
  // every render, and the document must not rebuild (reload) for that.
  const doc = useMemo(() => buildWidgetDocument({ html, css, js, theme }), [html, css, js, theme])

  const [generation, setGeneration] = useState(0)
  const [renderedDoc, setRenderedDoc] = useState(doc)
  const [height, setHeight] = useState(() => clampWidgetHeight(0))
  const [phase, setPhase] = useState<Phase>("loading")
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  // A new document (theme or source changed) means a fresh iframe: reset the
  // lifecycle state during render, the documented pattern for derived state.
  if (renderedDoc !== doc) {
    setRenderedDoc(doc)
    setGeneration((value) => value + 1)
    setPhase("loading")
    setError(null)
  }

  const reload = useCallback(() => {
    setGeneration((value) => value + 1)
    setPhase("loading")
    setError(null)
  }, [])

  // Theme flips rebuild the document. The observer fires on any <html> class
  // change, so only a theme that actually differs is stored.
  useEffect(
    () =>
      observeThemeChange(() => {
        const next = readChartThemeFromDocument()
        setTheme((prev) => (sameChartTheme(prev, next) ? prev : next))
      }),
    []
  )

  // Latest data for onLoad. Refs are written in effects, never during render.
  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
    const onMessage = (event: MessageEvent) => {
      // Read the frame at message time: it is a different element per generation.
      const win = iframeRef.current?.contentWindow
      if (!win || event.source !== win) return
      const msg = parseWidgetMessage(event.data)
      if (!msg) return
      if (msg.type === "arda:height") {
        clearTimer()
        setPhase("live")
        // Slider drags fire many resizes; skip moves under 2px.
        if (shouldApplyHeight(appliedHeightRef.current, msg.height)) {
          const next = clampWidgetHeight(msg.height)
          appliedHeightRef.current = next
          setHeight(next)
        }
      } else {
        console.warn("[olorin-widget]", msg.message)
        setError(msg.message)
      }
    }
    window.addEventListener("message", onMessage)
    return () => {
      window.removeEventListener("message", onMessage)
      clearTimer()
    }
  }, [generation])

  // React's onLoad, not addEventListener in an effect: for srcdoc the load
  // event can fire before an effect attaches the listener.
  const handleLoad = useCallback((event: React.SyntheticEvent<HTMLIFrameElement>) => {
    event.currentTarget.contentWindow?.postMessage({ type: "arda:data", data: dataRef.current }, "*")
    // Always armed: the runtime replies to arda:data with arda:height even when
    // the model handler throws, so any valid height clears this timer. A height
    // that arrived before this event does not count; only the reply does.
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      setPhase("timeout")
    }, WIDGET_TIMEOUT_MS)
  }, [])

  return (
    <div className={cn("my-3 overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xs", className)}>
      <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2 text-xs">
        <Sparkles className="size-3.5 text-primary" />
        <span className="font-semibold text-foreground">{title}</span>
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {t("ai.tool.widget.badge")}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          aria-label={expanded ? t("ai.tool.widget.collapse") : t("ai.tool.widget.expand")}
          title={expanded ? t("ai.tool.widget.collapse") : t("ai.tool.widget.expand")}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </Button>
      </div>
      {error && (
        <div
          data-testid="olorin-widget-error"
          className="flex items-center gap-2 bg-destructive/10 px-3 py-1.5 text-xs text-destructive"
        >
          <AlertTriangle className="size-3.5 shrink-0" />
          {/* Untrusted model text: plain text child only, React escapes it. */}
          <span className="min-w-0 truncate">
            {t("ai.tool.widget.error", { message: error.slice(0, ERROR_DISPLAY_CHARS) })}
          </span>
          <Button type="button" variant="ghost" size="sm" className="ml-auto h-6 shrink-0" onClick={reload}>
            {t("ai.tool.widget.reload")}
          </Button>
        </div>
      )}
      {phase === "timeout" ? (
        <div
          data-testid="olorin-widget-timeout"
          className="px-3 py-4 text-center text-xs text-muted-foreground"
        >
          {t("ai.tool.widget.timeout")}
          <Button type="button" variant="outline" size="sm" className="ml-2" onClick={reload}>
            {t("ai.tool.widget.retry")}
          </Button>
        </div>
      ) : (
        <iframe
          key={generation}
          ref={iframeRef}
          data-testid="olorin-widget-frame"
          title={title}
          sandbox="allow-scripts"
          srcDoc={doc}
          referrerPolicy="no-referrer"
          loading="lazy"
          onLoad={handleLoad}
          className="block w-full border-0"
          style={{ height: expanded ? "70vh" : `${height}px` }}
        />
      )}
      <div className="border-t border-border/40 px-3 py-1.5 text-[11px] text-muted-foreground">
        {t("ai.tool.widget.inputs", { summary: inputsSummary })}
      </div>
    </div>
  )
}

// Registry of mounted frames: the oldest beyond WIDGET_MAX_MOUNTED collapses
// to a "run again" card so a long thread never holds many live iframes.
const widgetSlots = new WidgetSlotRegistry(WIDGET_MAX_MOUNTED)

export function WidgetSlot(props: WidgetFrameProps) {
  const { t } = useI18n()
  const [collapsed, setCollapsed] = useState(false)

  // The release returned here runs on unmount, on collapse and on StrictMode's
  // simulated unmount, so a slot is never registered twice.
  useEffect(() => {
    if (collapsed) return
    return widgetSlots.acquire(() => setCollapsed(true))
  }, [collapsed])

  if (collapsed) {
    return (
      <div className="my-3 rounded-lg border border-dashed bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{props.title}</span> · {t("ai.tool.widget.collapsed")}
        <Button type="button" variant="outline" size="sm" className="ml-2" onClick={() => setCollapsed(false)}>
          {t("ai.tool.widget.run_again")}
        </Button>
      </div>
    )
  }
  return <WidgetFrame {...props} />
}
