import { useEffect, useMemo, useState } from "react"
import { makeAssistantToolUI } from "@assistant-ui/react"
import { useI18n } from "@workspace/i18n"
import { useOlorinContext } from "../../lib/context"
import {
  fetchExecuteResult,
  isWidgetPayload,
  widgetViewKind,
  type WidgetPayload,
} from "../../lib/results"
import { GenericToolView } from "./generic-tool-view"
import { WidgetSlot } from "./widget-frame"

type Hydration = { key: string; data: unknown; failed: boolean }

function WidgetError({ summary }: { summary?: string }) {
  const { t } = useI18n()
  return (
    <div
      data-testid="olorin-widget-error"
      className="my-3 rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-xs text-muted-foreground"
    >
      <div>{t("ai.tool.widget.data_error")}</div>
      {summary ? <div className="mt-1">{t("ai.tool.widget.inputs", { summary })}</div> : null}
    </div>
  )
}

function HydratedWidget({ payload }: { payload: WidgetPayload }) {
  const { threadId } = useOlorinContext()
  const resultId = typeof payload.result_id === "string" ? payload.result_id : ""
  const needsFetch = payload.data == null && resultId !== ""
  // Identifies the fetch this component is waiting on; a hydration result for
  // another key (new result id or thread) is stale and ignored.
  const fetchKey = needsFetch ? `${threadId}\n${resultId}` : null
  const [hydration, setHydration] = useState<Hydration | null>(null)

  useEffect(() => {
    if (fetchKey === null) return
    const controller = new AbortController()
    fetchExecuteResult(resultId, threadId, controller.signal)
      .then((output) => {
        if (!controller.signal.aborted) setHydration({ key: fetchKey, data: output, failed: false })
      })
      .catch(() => {
        if (!controller.signal.aborted) setHydration({ key: fetchKey, data: null, failed: true })
      })
    return () => controller.abort()
  }, [fetchKey, resultId, threadId])

  const settled = fetchKey !== null && hydration?.key === fetchKey ? hydration : null
  const loading = fetchKey !== null && settled === null
  const failed = settled?.failed === true
  const data: unknown = needsFetch ? (settled?.data ?? null) : (payload.data ?? null)

  // WidgetFrame posts data once per iframe load and does not re-send when the
  // prop changes, so a replaced data value must remount the frame. The counter
  // is bumped during render when the identity changes (derived-state pattern).
  const [seenData, setSeenData] = useState<unknown>(data)
  const [dataVersion, setDataVersion] = useState(0)
  if (!Object.is(seenData, data)) {
    setSeenData(data)
    setDataVersion((value) => value + 1)
  }

  const { html, css, js } = payload
  const source = useMemo(() => ({ html, css, js }), [html, css, js])

  if (loading) {
    return <div className="my-3 h-40 animate-pulse rounded-xl border border-border/60 bg-muted/30" />
  }
  if (failed) return <WidgetError summary={payload.inputs_summary} />
  return (
    <WidgetSlot
      key={dataVersion}
      title={payload.title}
      source={source}
      data={data}
      inputsSummary={payload.inputs_summary}
    />
  )
}

// renderWidget is a first-class output like renderChart, so it opts into
// display: "standalone" and never collapses into the activity group.
// A widget mounts only from a result with `widget === true` (validated by the
// backend). Tool-call args are never rendered: when the backend rejects the call
// the result is an error payload and the user sees the generic tool view, the
// same one the panel shows for any other tool.
export const RenderWidgetToolUI = makeAssistantToolUI<
  Record<string, unknown>,
  Record<string, unknown>
>({
  toolName: "renderWidget",
  display: "standalone",
  render: ({ result, status }) => {
    switch (widgetViewKind(result, status?.type)) {
      case "widget":
        return isWidgetPayload(result) ? <HydratedWidget payload={result} /> : null
      case "generic":
        return <GenericToolView toolName="renderWidget" result={result} />
      default:
        return null
    }
  },
})
