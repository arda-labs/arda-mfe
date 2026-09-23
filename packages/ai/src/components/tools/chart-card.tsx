import { useEffect, useRef, useState } from "react"
import type { EChartsOption, EChartsType } from "echarts"
import { useI18n } from "@workspace/i18n"
import { cn } from "@workspace/ui/lib/utils"
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

// formatAmount renders large VNĐ figures the way EPAS-style reports do.
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

function buildOption(chart: ChartPayload): EChartsOption {
  const format = typeof chart.value_format === "string" ? chart.value_format : ""
  const categories = toStringArray(chart.categories)
  const series = toSeries(chart.series)
  const type = typeof chart.type === "string" ? chart.type : "bar"

  if (type === "pie") {
    return {
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
          center: ["50%", "44%"],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: "#fff", borderWidth: 1 },
          label: { fontSize: 10 },
          data: categories.map((name, index) => ({
            name,
            value: series[0]?.values[index] ?? 0,
          })),
        },
      ],
    } as EChartsOption
  }

  return {
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => formatValue(Number(value) || 0, format),
    },
    grid: { left: 8, right: 12, top: 24, bottom: 8, containLabel: true },
    xAxis: {
      type: "category",
      data: categories,
      axisTick: { show: false },
      axisLabel: { fontSize: 10, interval: 0, rotate: categories.length > 6 ? 30 : 0 },
    },
    yAxis: {
      type: "value",
      axisLabel: { fontSize: 10, formatter: (value: number) => formatValue(value, format) },
      splitLine: { lineStyle: { opacity: 0.3 } },
    },
    series: series.map((item) => ({
      name: item.name,
      type: type === "line" ? "line" : "bar",
      data: item.values,
      smooth: type === "line",
      barMaxWidth: 36,
      itemStyle: { borderRadius: type === "bar" ? [3, 3, 0, 0] : 0 },
    })),
  } as EChartsOption
}

export function ChartView({
  chart,
  className,
  hideTitle = false,
}: {
  chart: ChartPayload
  className?: string
  hideTitle?: boolean
}) {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [failed, setFailed] = useState(false)
  const type = typeof chart.type === "string" ? chart.type : "none"
  const title = textValue(chart.title)
  const reason = textValue(chart.reason)

  useEffect(() => {
    if (type === "none") return
    const el = containerRef.current
    if (!el) return
    let disposed = false
    let instance: EChartsType | undefined
    let observer: ResizeObserver | undefined
    void (async () => {
      try {
        const echarts = await import("echarts")
        if (disposed || !containerRef.current) return
        instance = echarts.init(containerRef.current, undefined, { renderer: "canvas" })
        instance.setOption(buildOption(chart), true)
        observer = new ResizeObserver(() => instance?.resize())
        observer.observe(containerRef.current)
      } catch {
        if (!disposed) setFailed(true)
      }
    })()
    return () => {
      disposed = true
      observer?.disconnect()
      instance?.dispose()
    }
  }, [chart, type])

  if (type === "none") {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
        {reason || t("ai.tool.report.chart_empty")}
      </div>
    )
  }

  return (
    <div className={cn("space-y-1", className)}>
      {!hideTitle && title && <p className="text-xs font-medium text-foreground">{title}</p>}
      <div ref={containerRef} className="h-64 w-full" />
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
