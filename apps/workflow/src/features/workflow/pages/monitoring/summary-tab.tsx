import { useCallback, useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { workflowApi } from "../../api"
import type { OperateSummary, OperateSummaryCount } from "../../api"

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: number
  tone?: "default" | "warning" | "danger"
}) {
  const toneClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-amber-600"
        : "text-foreground"
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}

function BreakdownCard({
  title,
  items,
  emptyLabel,
}: {
  title: string
  items: OperateSummaryCount[]
  emptyLabel: string
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm font-medium">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {items.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="min-w-0 truncate font-mono">{item.label}</span>
              <span className="shrink-0 font-semibold">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function SummaryTab() {
  const { t } = useI18n()
  const [summary, setSummary] = useState<OperateSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSummary(await workflowApi.getOperateSummary())
    } catch (reason) {
      setError(reason)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {loading
            ? t("workflow.operate.monitoring_loading")
            : t("workflow.operate.summary_runtime_note")}
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => void load()}
        >
          <RefreshCw className="mr-1 size-3.5" />
          {t("workflow.operate.refresh")}
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {t("workflow.operate.monitoring_load_failed")}
          {error instanceof Error ? `: ${error.message}` : ""}
        </div>
      ) : null}

      {summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              label={t("workflow.operate.metric_active_instances")}
              value={summary.activeInstances}
            />
            <MetricCard
              label={t("workflow.operate.metric_open_incidents")}
              value={summary.openIncidents}
              tone={summary.openIncidents > 0 ? "danger" : "default"}
            />
            <MetricCard
              label={t("workflow.operate.metric_failed_jobs")}
              value={summary.failedJobs}
              tone={summary.failedJobs > 0 ? "warning" : "default"}
            />
          </div>

          {summary.truncated ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {t("workflow.operate.summary_truncated")}
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-3">
            <BreakdownCard
              title={t("workflow.operate.summary_instances_by_process")}
              items={summary.instancesByProcess}
              emptyLabel={t("workflow.operate.summary_empty")}
            />
            <BreakdownCard
              title={t("workflow.operate.summary_incidents_by_type")}
              items={summary.incidentsByType}
              emptyLabel={t("workflow.operate.summary_empty")}
            />
            <BreakdownCard
              title={t("workflow.operate.summary_jobs_by_type")}
              items={summary.failedJobsByType}
              emptyLabel={t("workflow.operate.summary_empty")}
            />
          </div>
        </>
      ) : null}
    </div>
  )
}
