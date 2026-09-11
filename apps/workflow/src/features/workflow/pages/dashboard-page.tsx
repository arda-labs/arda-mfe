import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { apiUrl } from "@workspace/api/url"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { getWorkflowAnalytics, workItemsExportUrl, type WorkflowAnalytics } from "../api"

function firstOfMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
}

function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

/** Workflow activity dashboard (W6): cases by status/type + task SLA. */
export function DashboardPage() {
  const { t } = useI18n()
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(today())
  const [summary, setSummary] = useState<WorkflowAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      setSummary(await getWorkflowAnalytics({ from, to }))
    } catch {
      setSummary(null)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    void load()
  }, [load])

  const exportWorkItems = async () => {
    try {
      const response = await fetch(apiUrl(workItemsExportUrl()), { credentials: "include" })
      if (!response.ok) throw new Error(String(response.status))
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `work-items-${from}-${to}.xlsx`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      notify.error(t("workflow.dashboard.export_failed"))
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("workflow.dashboard.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("workflow.dashboard.description")}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label>{t("workflow.dashboard.field.from")}</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("workflow.dashboard.field.to")}</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {t("workflow.dashboard.run")}
          </Button>
          <Button variant="outline" onClick={() => void exportWorkItems()}>
            {t("workflow.dashboard.export")}
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {t("workflow.dashboard.load_failed")}
        </div>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card label={t("workflow.dashboard.cases_total")} value={summary.cases_total} />
            <Card label={t("workflow.dashboard.open_tasks")} value={summary.open_tasks} />
            <Card
              label={t("workflow.dashboard.overdue_tasks")}
              value={summary.overdue_tasks}
              critical={summary.overdue_tasks > 0}
            />
            <Card
              label={t("workflow.dashboard.case_types_count")}
              value={Object.keys(summary.by_case_type).length}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Table
              title={t("workflow.dashboard.by_status")}
              rows={Object.entries(summary.by_status)}
              empty={t("workflow.dashboard.empty")}
            />
            <Table
              title={t("workflow.dashboard.by_case_type")}
              rows={Object.entries(summary.by_case_type)}
              empty={t("workflow.dashboard.empty")}
            />
          </div>
        </>
      )}
    </div>
  )
}

function Card({ label, value, critical }: { label: string; value: number; critical?: boolean }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${critical ? "text-destructive" : ""}`}>
        {value}
      </div>
    </div>
  )
}

function Table({ title, rows, empty }: { title: string; rows: [string, number][]; empty: string }) {
  const { t } = useI18n()
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("workflow.dashboard.key")}</th>
              <th className="px-3 py-2 text-right">{t("workflow.dashboard.count")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={2} className="px-3 py-4 text-center text-muted-foreground">
                  {empty}
                </td>
              </tr>
            )}
            {rows.map(([key, count]) => (
              <tr key={key} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{key}</td>
                <td className="px-3 py-2 text-right tabular-nums">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
