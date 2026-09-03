import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { PageHeader } from "@workspace/ui/components/page-header"
import {
  Activity,
  BarChart3,
  Clock,
  Coins,
  Cpu,
  RefreshCw,
} from "lucide-react"
import { analyticsApi } from "./api"
import { CostModelTable } from "./components/cost-model-table"
import { RAGQualityCard } from "./components/rag-quality-card"
import { StatKpiCard } from "./components/stat-kpi-card"
import { TrendChart } from "./components/trend-chart"
import type { AnalyticsSummary } from "./types"

export function AnalyticsPage() {
  const { t, formatNumber } = useI18n()
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await analyticsApi.getOverview()
      setData(res)
    } catch {
      notify.error(t("ai.analytics.load_failed"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title={t("ai.analytics.title")}
          description={t("ai.analytics.description")}
          icon={BarChart3}
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-2 self-start sm:self-auto"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("ai.analytics.btn.refresh")}
        </Button>
      </div>

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatKpiCard
              title={t("ai.analytics.kpi.total_runs")}
              value={formatNumber(data.totalRuns)}
              subtext={`${data.successRate.toFixed(1)}% ${t("ai.analytics.kpi.success_rate")}`}
              icon={Activity}
              trend="+14.2%"
              trendPositive
            />
            <StatKpiCard
              title={t("ai.analytics.kpi.total_tokens")}
              value={formatNumber(data.totalTokens)}
              subtext={`${formatNumber(data.promptTokens)} in / ${formatNumber(data.completionTokens)} out`}
              icon={Cpu}
              trend="+8.5%"
              trendPositive
            />
            <StatKpiCard
              title={t("ai.analytics.kpi.estimated_cost")}
              value={`$${data.estimatedCostUsd.toFixed(3)}`}
              subtext={t("ai.analytics.kpi.cost_per_tenant")}
              icon={Coins}
            />
            <StatKpiCard
              title={t("ai.analytics.kpi.latency_p95")}
              value={`${data.latency.p95Ms}ms`}
              subtext={`Avg: ${data.latency.avgMs}ms • P99: ${data.latency.p99Ms}ms`}
              icon={Clock}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <TrendChart data={data.runsByDay} />
            <RAGQualityCard quality={data.ragQuality} feedback={data.feedback} />
          </div>

          <div>
            <CostModelTable models={data.costByModel} />
          </div>
        </div>
      )}
    </div>
  )
}
