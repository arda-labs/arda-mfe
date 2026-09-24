import { useEffect, useRef, useState } from "react"
import type { EChartsOption, EChartsType } from "echarts"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { BarChart3, Download, LineChart, Maximize2, PieChart } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
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

type Translate = (key: string, params?: Record<string, string | number>) => string
type FormatNumber = (value: number, options?: Intl.NumberFormatOptions) => string

// formatAmount renders large VNĐ figures the way banking reports do.
function formatAmount(value: number, t: Translate, formatNumber: FormatNumber): string {
  const abs = Math.abs(value)
  if (abs >= 1e9) return `${formatNumber(value / 1e9, { maximumFractionDigits: 2 })} ${t("ai.tool.chart.billion")}`
  if (abs >= 1e6) return `${formatNumber(value / 1e6, { maximumFractionDigits: 2 })} ${t("ai.tool.chart.million")}`
  return formatNumber(value, { maximumFractionDigits: 0 })
}

function formatValue(value: number, format: string, t: Translate, formatNumber: FormatNumber): string {
  switch (format) {
    case "percent":
      return `${formatNumber(value, { maximumFractionDigits: 2 })}%`
    case "int":
      return formatNumber(value, { maximumFractionDigits: 0 })
    case "amount":
      return formatAmount(value, t, formatNumber)
    default:
      return formatNumber(value, { maximumFractionDigits: 2 })
  }
}

function formatSubtitle(format: string, t: Translate): string {
  switch (format) {
    case "amount":
      return t("ai.tool.chart.unit_amount")
    case "percent":
      return t("ai.tool.chart.unit_percent")
    case "int":
      return t("ai.tool.chart.unit_count")
    default:
      return ""
  }
}

function buildOption(
  chart: ChartPayload,
  kind: ChartKind,
  showTitle: boolean,
  t: Translate,
  formatNumber: FormatNumber
): EChartsOption {
  const format = typeof chart.value_format === "string" ? chart.value_format : ""
  const categories = toStringArray(chart.categories)
  const series = toSeries(chart.series)
  const title = textValue(chart.title)
  const subtitle = formatSubtitle(format, t)

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
          return `${String(point.name ?? "")}: ${formatValue(Number(point.value) || 0, format, t, formatNumber)}`
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
    axisLabel: { fontSize: 10, formatter: (value: number) => formatValue(value, format, t, formatNumber) },
    splitLine: { lineStyle: { opacity: 0.3 } },
  }

  return {
    color: PALETTE,
    title: heading,
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => formatValue(Number(value) || 0, format, t, formatNumber),
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
  inDialog = false,
}: {
  chart: ChartPayload
  className?: string
  hideTitle?: boolean
  allowSwitch?: boolean
  inDialog?: boolean
}) {
  const { t, formatNumber } = useI18n()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const instanceRef = useRef<EChartsType | undefined>(undefined)
  const [failed, setFailed] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
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
        instance.setOption(buildOption(chart, kind, !hideTitle, t, formatNumber), true)
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
  }, [chart, type, kind, hideTitle, t, formatNumber])

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

  const chartHeight = inDialog
    ? 500
    : categories.length > 6
      ? Math.min(520, Math.max(240, categories.length * 30))
      : 256

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
          {!inDialog && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => setIsExpanded(true)}
              title={t("ai.tool.chart.expand")}
            >
              <Maximize2 className="size-3" />
              <span className="hidden sm:inline">{t("ai.tool.chart.expand")}</span>
            </Button>
          )}
        </div>
      )}
      {!hideTitle && !chart.title && null}
      <div ref={containerRef} className="w-full" style={{ height: chartHeight }} />
      {failed && <p className="text-[11px] text-muted-foreground">{t("ai.tool.report.chart_empty")}</p>}

      {!inDialog && (
        <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
          <DialogContent className="max-w-6xl w-[95vw] max-h-[92vh] flex flex-col p-4 sm:p-5 overflow-hidden">
            <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/60">
              <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="size-4 text-primary" />
                <span>{textValue(chart.title) || t("ai.tool.chart.fullscreen_title")}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 w-full pt-2">
              <ChartView chart={chart} inDialog />
            </div>
          </DialogContent>
        </Dialog>
      )}
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
