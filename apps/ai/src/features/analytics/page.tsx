import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { PageHeader } from "@workspace/ui/components/page-header"
import {
  Activity,
  CheckCircle2,
  BarChart3,
  Clock,
  Cpu,
  GitBranch,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from "lucide-react"
import { analyticsApi } from "./api"
import { ModelUsageTable } from "./components/model-usage-table"
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
          <section className="space-y-3" aria-labelledby="reasoning-metrics">
            <div className="flex items-center gap-2">
              <Cpu className="size-4 text-sky-600" />
              <h2 id="reasoning-metrics" className="text-sm font-semibold">
                {t("ai.analytics.roles.reasoning")}
              </h2>
              <span className="text-xs text-muted-foreground">
                {t("ai.analytics.roles.reasoning_hint")}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatKpiCard
                title={t("ai.analytics.kpi.total_runs")}
                value={formatNumber(data.totalRuns)}
                subtext={`${data.successRate.toFixed(1)}% ${t("ai.analytics.kpi.success_rate")}`}
                icon={Activity}
              />
              <StatKpiCard
                title={t("ai.analytics.kpi.total_tokens")}
                value={formatNumber(data.totalTokens)}
                subtext={`${formatNumber(data.promptTokens)} in / ${formatNumber(data.completionTokens)} out`}
                icon={Cpu}
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
              <RAGQualityCard
                quality={data.ragQuality}
                feedback={data.feedback}
              />
            </div>

            <div>
              <ModelUsageTable models={data.modelsByUsage} />
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="decision-metrics">
            <div className="flex items-center gap-2">
              <GitBranch className="size-4 text-violet-600" />
              <h2 id="decision-metrics" className="text-sm font-semibold">
                {t("ai.analytics.roles.decision")}
              </h2>
              <span className="text-xs text-muted-foreground">
                {t("ai.analytics.roles.decision_hint")}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatKpiCard
                title={t("ai.analytics.decision.evaluations")}
                value={formatNumber(data.decision?.evaluations ?? 0)}
                icon={GitBranch}
              />
              <StatKpiCard
                title={t("ai.analytics.decision.routed")}
                value={formatNumber(data.decision?.routed ?? 0)}
                subtext={`${formatNumber(data.decision?.low_confidence ?? 0)} ${t("ai.analytics.decision.low_confidence")}`}
                icon={CheckCircle2}
              />
              <StatKpiCard
                title={t("ai.analytics.decision.tokens")}
                value={formatNumber(data.decision?.tokens ?? 0)}
                subtext={`${t("ai.analytics.decision.average_confidence")}: ${((data.decision?.average_confidence ?? 0) * 100).toFixed(0)}%`}
                icon={Cpu}
              />
              <StatKpiCard
                title={t("ai.analytics.decision.avg_latency")}
                value={`${data.decision?.avg_latency_ms ?? 0}ms`}
                icon={Clock}
              />
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="action-metrics">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600" />
              <h2 id="action-metrics" className="text-sm font-semibold">
                {t("ai.analytics.roles.actions")}
              </h2>
              <span className="text-xs text-muted-foreground">
                {t("ai.analytics.roles.actions_hint")}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatKpiCard
                title={t("ai.analytics.actions.tool_calls")}
                value={formatNumber(data.agentic?.tool_calls ?? 0)}
                subtext={`${formatNumber(data.agentic?.successful_calls ?? 0)} ${t("ai.analytics.actions.succeeded")} · ${formatNumber(data.agentic?.failed_calls ?? 0)} ${t("ai.analytics.actions.failed")}`}
                icon={Wrench}
              />
              <StatKpiCard
                title={t("ai.analytics.actions.pending")}
                value={formatNumber(data.agentic?.pending_approvals ?? 0)}
                icon={Clock}
              />
              <StatKpiCard
                title={t("ai.analytics.actions.approved")}
                value={formatNumber(data.agentic?.approved_actions ?? 0)}
                icon={CheckCircle2}
              />
              <StatKpiCard
                title={t("ai.analytics.actions.rejected")}
                value={formatNumber(data.agentic?.rejected_actions ?? 0)}
                icon={ShieldCheck}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
