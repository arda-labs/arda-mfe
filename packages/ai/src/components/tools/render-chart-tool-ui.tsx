import { makeAssistantToolUI } from "@assistant-ui/react"
import { useI18n } from "@workspace/i18n"
import { BarChart3 } from "lucide-react"
import { ChartView, isChartPayload, type ChartPayload } from "./chart-card"
import type { ToolResultPayload } from "../../lib/messages"

function chartPayloadFromArgs(
  args: Record<string, unknown> | undefined,
  seriesLabel: string
): ChartPayload | undefined {
  if (!args || !Array.isArray(args.categories) || !Array.isArray(args.series))
    return
  const categories = args.categories.filter(
    (item): item is string => typeof item === "string"
  )
  const series = args.series.filter(
    (item): item is { name?: string; values: unknown[] } =>
      typeof item === "object" &&
      item !== null &&
      Array.isArray((item as Record<string, unknown>).values)
  )
  if (categories.length === 0 || series.length === 0) return
  const values = series.map((item, index) => ({
    name:
      typeof item.name === "string" && item.name.trim()
        ? item.name
        : `${seriesLabel} ${index + 1}`,
    values: item.values.map((value) =>
      typeof value === "number" ? value : Number(value) || 0
    ),
  }))
  return {
    type: args.chart_type,
    title: args.title,
    categories,
    series: values,
    value_format: args.value_format,
  }
}

function StandaloneChartCard({
  chart,
  title,
}: {
  chart: ChartPayload
  title?: string
}) {
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
      {title && (
        <div className="mb-3 flex items-center gap-2 border-b border-border/40 pb-2.5">
          <BarChart3 className="size-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
      )}
      <ChartView chart={chart} hideTitle={Boolean(title)} />
    </div>
  )
}

function ChartArgsPreview({ args }: { args: Record<string, unknown> }) {
  const { t } = useI18n()
  const chart = chartPayloadFromArgs(args, t("ai.tool.report.series"))
  const title = typeof args.title === "string" ? args.title : undefined
  return chart ? <StandaloneChartCard chart={chart} title={title} /> : null
}

// renderChart is a first-class output (a chart), not a processing step, so its
// UI opts into `display: "standalone"`. That takes the tool-call out of the
// chain-of-thought activity group, which collapses once the turn settles and
// would otherwise hide the chart behind "Đã xử lý trong Xs".
export const RenderChartToolUI = makeAssistantToolUI<
  Record<string, unknown>,
  Record<string, unknown>
>({
  toolName: "renderChart",
  display: "standalone",
  render: ({ args, result }) => {
    if (result) {
      const res = result as ToolResultPayload
      const chart = isChartPayload(res.chart)
        ? res.chart
        : isChartPayload(res)
          ? res
          : undefined
      const title =
        typeof res.report_name === "string"
          ? res.report_name
          : typeof (args as Record<string, unknown> | undefined)?.title === "string"
            ? ((args as Record<string, unknown>).title as string)
            : undefined

      if (chart) {
        return <StandaloneChartCard chart={chart} title={title} />
      }
    }
    return args ? <ChartArgsPreview args={args} /> : null
  },
})
