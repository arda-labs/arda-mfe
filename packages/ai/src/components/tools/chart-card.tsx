import { useEffect, useRef, useState } from "react"
import type { EChartsOption, EChartsType } from "echarts"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { BarChart3, Download, LineChart, PieChart } from "lucide-react"
import { textValue, type ToolResultPayload } from "../../lib/messages"
import { registerToolRenderer } from "../../lib/registry"

// ChartPayload mirrors the deterministic `chart` contract emitted by
// statistical-service (presentation.Chart -> AiChart in the AI contract).
export type ChartPayload = {
  type?: unknown
  title?: unknown
  categories?: unknown
  series?: unknown
  value_format?: unknown
  reason?: unknown
}

export function isChartPayload(value: unknown): value is ChartPayload {
  if (typeof value !== "object" || value === null) return false
  const chart = value as ChartPayload
  if (typeof chart.type !== "string") return false
  return chart.type === "none" || Array.isArray(chart.categories)
}

export function isChartResult(result: ToolResultPayload): boolean {
  return isChartPayload(result)
}

type ChartKind = "bar" | "line" | "pie"

// A curated banking palette so the chart matches the Arda theme instead of the
// ECharts default colours.
const PALETTE = [
  "#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#14b8a6", "#f97316", "#64748b", "#a855f7",
]

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => (item == null ? "" : String(item))) : []
}

function toSeries(value: unknown): { name: string; values: number[] }[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      name: textValue(item.name),
      values: Array.isArray(item.values)
        ? item.values.map((raw) => (typeof raw === "number" ? raw : Number(raw) || 0))
        : [],
    }))
}

// formatAmount renders large VNĐ figures the way banking reports do.
function formatAmount(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e9) return `${(value / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ`
  if (abs >= 1e6) return `${(value / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tr`
  return value.toLocaleString("vi-VN", { maximumFractionDigits: 0 })
}

function formatValue(value: number, format: string): string {
  switch (format) {
    case "percent":
      return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`
    case "int":
      return value.toLocaleString("vi-VN", { maximumFractionDigits: 0 })
    case "amount":
      return formatAmount(value)
    default:
      return value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })
  }
}

function formatSubtitle(format: string): string {
  switch (format) {
    case "amount":
      return "Đơn vị: VNĐ"
    case "percent":
      return "Đơn vị: %"
    case "int":
      return "Đơn vị: số lượng"
    default:
      return ""
  }
}

function buildOption(chart: ChartPayload, kind: ChartKind, showTitle: boolean): EChartsOption {
  const format = typeof chart.value_format === "string" ? chart.value_format : ""
  const categories = toStringArray(chart.categories)
  const series = toSeries(chart.series)
  const title = textValue(chart.title)
  const subtitle = formatSubtitle(format)

  const heading =
    (showTitle && title) || subtitle
      ? {
          text: showTitle ? title : "",
          subtext: subtitle,
          left: "center",
          textStyle: { fontSize: 13, fontWeight: 600 },
          subtextStyle: { fontSize: 10, color: "#64748b" },
        }
      : undefined

  if (kind === "pie") {
    return {
      color: PALETTE,
      title: heading,
      tooltip: {
        trigger: "item",
        formatter: (params: unknown) => {
          const point = params as { name?: unknown; value?: unknown }
          return `${String(point.name ?? "")}: ${formatValue(Number(point.value) || 0, format)}`
        },
      },
      legend: { bottom: 0, type: "scroll", textStyle: { fontSize: 11 } },
      series: [
        {
          type: "pie",
          radius: ["42%", "68%"],
          center: ["50%", "46%"],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: "#fff", borderWidth: 1 },
          label: { fontSize: 10, formatter: (params: unknown) => String((params as { name?: unknown }).name ?? "") },
          data: categories.map((name, index) => ({ name, value: series[0]?.values[index] ?? 0 })),
        },
      ],
    } as EChartsOption
  }

  // Long category labels read better as a horizontal bar (names on the left),
  // matching the layout EPAS uses for ranked lists.
  const horizontal = categories.length > 6
  const categoryAxis = {
    type: "category" as const,
    data: categories,
    axisTick: { show: false },
    axisLabel: { fontSize: 10, interval: 0, rotate: horizontal ? 0 : categories.length > 6 ? 30 : 0 },
  }
  const valueAxis = {
    type: "value" as const,
    axisLabel: { fontSize: 10, formatter: (value: number) => formatValue(value, format) },
    splitLine: { lineStyle: { opacity: 0.3 } },
  }

  return {
    color: PALETTE,
    title: heading,
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => formatValue(Number(value) || 0, format),
    },
    grid: { left: 8, right: 16, top: subtitle || title ? 52 : 24, bottom: 8, containLabel: true },
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? { ...categoryAxis, inverse: true } : valueAxis,
    series: series.map((item) => ({
      name: item.name,
      type: kind === "line" ? "line" : "bar",
      data: item.values,
      smooth: kind === "line",
      barMaxWidth: horizontal ? 18 : 36,
      itemStyle: { borderRadius: horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0] },
    })),
  } as EChartsOption
}

function asKind(value: unknown): ChartKind | undefined {
  return value === "bar" || value === "line" || value === "pie" ? value : undefined
}

export function ChartView({
  chart,
  className,
  hideTitle = false,
  allowSwitch = true,
}: {
  chart: ChartPayload
  className?: string
  hideTitle?: boolean
  allowSwitch?: boolean
}) {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const instanceRef = useRef<EChartsType | undefined>(undefined)
  const [failed, setFailed] = useState(false)
  const serverKind = asKind(chart.type) ?? "bar"
  const [kind, setKind] = useState<ChartKind>(serverKind)
  const type = typeof chart.type === "string" ? chart.type : "none"
  const reason = textValue(chart.reason)
  const categories = toStringArray(chart.categories)
  const seriesCount = toSeries(chart.series).length
  const canSwitch = allowSwitch && seriesCount === 1 && kind !== undefined

  useEffect(() => {
    if (type === "none") return
    const el = containerRef.current
    if (!el) return
    let disposed = false
    let observer: ResizeObserver | undefined
    void (async () => {
      try {
        const echarts = await import("echarts")
        if (disposed || !containerRef.current) return
        const instance = echarts.init(containerRef.current, undefined, { renderer: "canvas" })
        instanceRef.current = instance
        instance.setOption(buildOption(chart, kind, !hideTitle), true)
        observer = new ResizeObserver(() => instance.resize())
        observer.observe(containerRef.current)
      } catch {
        if (!disposed) setFailed(true)
      }
    })()
    return () => {
      disposed = true
      observer?.disconnect()
      instanceRef.current?.dispose()
      instanceRef.current = undefined
    }
  }, [chart, type, kind, hideTitle])

  const handleDownloadPng = () => {
    const instance = instanceRef.current
    if (!instance) return
    const url = instance.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#ffffff" })
    const link = document.createElement("a")
    link.href = url
    link.download = `${textValue(chart.title, "chart")}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (type === "none") {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
        {reason || t("ai.tool.report.chart_empty")}
      </div>
    )
  }

  const chartHeight = categories.length > 6 ? Math.min(520, Math.max(240, categories.length * 30)) : 256

  return (
    <div className={cn("space-y-1.5", className)}>
      {(canSwitch || type !== "none") && (
        <div className="flex items-center justify-end gap-1">
          {canSwitch && (
            <div className="mr-auto flex items-center gap-0.5 rounded-md border bg-muted/20 p-0.5">
              {(
                [
                  { key: "bar" as const, icon: BarChart3, label: t("ai.tool.report.chart_bar") },
                  { key: "line" as const, icon: LineChart, label: t("ai.tool.report.chart_line") },
                  { key: "pie" as const, icon: PieChart, label: t("ai.tool.report.chart_pie") },
                ]
              ).map(({ key, icon: Icon, label }) => (
                <Button
                  key={key}
                  type="button"
                  variant={kind === key ? "secondary" : "ghost"}
                  size="icon"
                  className="size-6"
                  onClick={() => setKind(key)}
                  aria-label={label}
                  title={label}
                >
                  <Icon className="size-3.5" />
                </Button>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={handleDownloadPng}
            title={t("ai.tool.report.chart_download")}
          >
            <Download className="size-3" />
            PNG
          </Button>
        </div>
      )}
      {!hideTitle && !chart.title && null}
      <div ref={containerRef} className="w-full" style={{ height: chartHeight }} />
      {failed && <p className="text-[11px] text-muted-foreground">{t("ai.tool.report.chart_empty")}</p>}
    </div>
  )
}

export function registerChartRenderer() {
  registerToolRenderer({
    id: "arda.statistical-chart",
    match: isChartResult,
    component: ChartResultView,
  })
}

function ChartResultView({ result }: { result: ToolResultPayload }) {
  return <ChartView chart={result} />
}
