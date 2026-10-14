import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { AlertTriangle, Maximize2, Minimize2, Sparkles } from "lucide-react"
import { observeThemeChange, readChartThemeFromDocument } from "../../lib/chart-theme"
import {
  sameChartTheme,
  shouldApplyHeight,
  shouldPostData,
  WidgetSlotRegistry,
} from "../../lib/widget-frame-logic"
import { buildWidgetDocument, WIDGET_SANDBOX, type WidgetSource } from "../../lib/widget-host"
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
// The iframe element is the same in every state, and is only recreated through
// `generation`: theme flip, changed source, or a retry/reload button. Expand
// therefore restyles the card in place as a fixed overlay over the viewport;
// moving the iframe into a portal or dialog would reload it and lose what the
// user changed in it.
export function WidgetFrame({ title, source, data, inputsSummary, className }: WidgetFrameProps) {
  const { t } = useI18n()
  const { html, css, js } = source
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const dataRef = useRef(data)
  const timerRef = useRef<number | null>(null)
  const appliedHeightRef = useRef(clampWidgetHeight(0))
  // Generation the business data was last posted for (see shouldPostData).
  const sentGenerationRef = useRef<number | null>(null)

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
  const toggleRef = useRef<HTMLButtonElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  // Height the card had in the conversation, kept as a placeholder while it is
  // an overlay so the thread below does not jump.
  const [placeholderHeight, setPlaceholderHeight] = useState(0)
  const toggleExpanded = useCallback(() => {
    if (!expanded) setPlaceholderHeight(cardRef.current?.offsetHeight ?? 0)
    setExpanded(!expanded)
  }, [expanded])

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

  // Escape closes the overlay; focus moves to its close button so keyboard
  // users land inside it.
  useEffect(() => {
    if (!expanded) return
    toggleRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [expanded])

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
  const handleLoad = useCallback(
    (event: React.SyntheticEvent<HTMLIFrameElement>) => {
      // Data goes to the document the parent built, once per generation. A
      // widget that reloads or navigates itself fires `load` again on the same
      // contentWindow; that document does not get the data.
      if (shouldPostData(sentGenerationRef.current, generation)) {
        sentGenerationRef.current = generation
        event.currentTarget.contentWindow?.postMessage({ type: "arda:data", data: dataRef.current }, "*")
      }
      // Re-armed on every load: the runtime replies to arda:data with arda:height
      // even when the model handler throws, so any valid height clears this
      // timer. A self-navigated frame never replies, so the timeout tears it
      // down. A height that arrived before this event does not count.
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        setPhase("timeout")
      }, WIDGET_TIMEOUT_MS)
    },
    [generation]
  )

  // The backdrop slot is always present (false when collapsed) so the card
  // keeps its position among the fragment's children and is never remounted.
  return (
    <>
      {expanded && (
        <div
          aria-hidden
          data-testid="olorin-widget-backdrop"
          className="fixed inset-0 z-50 bg-black/40 motion-safe:animate-in motion-safe:fade-in-0"
          onClick={() => setExpanded(false)}
        />
      )}
      <div
        ref={cardRef}
        role={expanded ? "dialog" : undefined}
        aria-modal={expanded || undefined}
        aria-label={expanded ? title : undefined}
        className={cn(
          "overflow-hidden rounded-xl border border-border/80 bg-card",
          expanded ? "fixed inset-2 z-50 flex flex-col shadow-2xl sm:inset-6" : "my-3 shadow-2xs",
          className
        )}
      >
        <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2 text-xs">
          <Sparkles className="size-3.5 shrink-0 text-primary" />
          <span className="min-w-0 truncate font-semibold text-foreground" title={title}>
            {title}
          </span>
          <span className="ml-auto shrink-0 whitespace-nowrap rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {t("ai.tool.widget.badge")}
          </span>
          <Button
            ref={toggleRef}
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 shrink-0"
            aria-label={expanded ? t("ai.tool.widget.collapse") : t("ai.tool.widget.expand")}
            title={expanded ? t("ai.tool.widget.collapse") : t("ai.tool.widget.expand")}
            onClick={toggleExpanded}
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
            sandbox={WIDGET_SANDBOX}
            srcDoc={doc}
            referrerPolicy="no-referrer"
            loading="lazy"
            onLoad={handleLoad}
            className={cn("block w-full border-0", expanded && "min-h-0 flex-1")}
            style={expanded ? undefined : { height: `${height}px` }}
          />
        )}
        <div className="border-t border-border/40 px-3 py-1.5 text-[11px] text-muted-foreground">
          {t("ai.tool.widget.inputs", { summary: inputsSummary })}
        </div>
      </div>
      {expanded && <div aria-hidden className="my-3" style={{ height: placeholderHeight }} />}
    </>
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
