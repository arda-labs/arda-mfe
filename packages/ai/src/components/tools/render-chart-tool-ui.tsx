import { makeAssistantToolUI } from "@assistant-ui/react"
import { useI18n } from "@workspace/i18n"
import { ReportPresentationCard } from "./report-presentation-card"
import type { ToolResultPayload } from "../../lib/messages"

function chartPayloadFromArgs(
  args: Record<string, unknown> | undefined,
  categoryLabel: string,
  seriesLabel: string
): ToolResultPayload | undefined {
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
  const columns = [categoryLabel, ...values.map((item) => item.name)]
  const rows = categories.map((category, index) => [
    category,
    ...values.map((item) => item.values[index] ?? 0),
  ])
  return {
    render: "report",
    report_name: typeof args.title === "string" ? args.title : "",
    report_code: typeof args.report_code === "string" ? args.report_code : "",
    period_code: typeof args.period_code === "string" ? args.period_code : "",
    org_code: typeof args.org_code === "string" ? args.org_code : "",
    columns,
    rows,
    row_count: rows.length,
    kpis: [],
    chart: {
      type: args.chart_type,
      title: args.title,
      categories,
      series: values,
      value_format: args.value_format,
    },
  }
}

function ChartArgsPreview({ args }: { args: Record<string, unknown> }) {
  const { t } = useI18n()
  const payload = chartPayloadFromArgs(
    args,
    t("ai.tool.report.category"),
    t("ai.tool.report.series")
  )
  return payload ? <ReportPresentationCard result={payload} /> : null
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
    if (result && Array.isArray((result as Record<string, unknown>).columns)) {
      return <ReportPresentationCard result={result as ToolResultPayload} />
    }
    return args ? <ChartArgsPreview args={args} /> : null
  },
})
