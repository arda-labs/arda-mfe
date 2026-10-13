import { useCallback, useState, type ReactNode } from "react"
import { useSearchParams } from "react-router-dom"
import { translateApiError, useI18n } from "@workspace/i18n"
import { formatDateTime } from "@workspace/format"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { StatusBadge } from "@workspace/ui/components/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { notify } from "@workspace/ui/feedback/notify"
import { apiErrorCode, humanCron, statusVariant } from "../format"
import { useCronPreview, useRunJob, useScheduledJobs } from "../hooks"
import { JOB_PROBLEM, type ScheduledJob } from "../types"
import { JobEditDialog } from "./JobEditDialog"
import { RunHistoryDrawer } from "./RunHistoryDrawer"

const COLUMN_COUNT = 6

type TableProps = {
  jobs: ScheduledJob[]
  onEdit: (job: ScheduledJob) => void
  onRun: (job: ScheduledJob) => void
  onHistory: (job: ScheduledJob) => void
  runningCode: string | null
  loading?: boolean
  /** Optional per-row schedule preview (kept out of the table so it stays pure). */
  renderPreview?: (job: ScheduledJob) => ReactNode
}

/** Pure table: no data fetching, so it renders from fixtures in tests. */
export function ScheduledJobsTable({
  jobs,
  onEdit,
  onRun,
  onHistory,
  runningCode,
  loading = false,
  renderPreview,
}: TableProps) {
  const { t, locale } = useI18n()
  const ns = "platform.scheduled_jobs"
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>{t(`${ns}.col.name`)}</TableHead>
            <TableHead>{t(`${ns}.col.schedule`)}</TableHead>
            <TableHead>{t(`${ns}.col.next_run`)}</TableHead>
            <TableHead>{t(`${ns}.col.last_status`)}</TableHead>
            <TableHead>{t(`${ns}.col.enabled`)}</TableHead>
            <TableHead className="text-right">{t("common.field.action")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT} className="py-4 text-center text-muted-foreground">
                {t(`${ns}.loading`)}
              </TableCell>
            </TableRow>
          )}
          {!loading && jobs.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT} className="py-4 text-center text-muted-foreground">
                {t(`${ns}.empty`)}
              </TableCell>
            </TableRow>
          )}
          {jobs.map((job) => {
            const description = humanCron(job.cron_expr, t)
            const retired = job.retired_at !== null
            return (
              <TableRow key={job.code} data-testid={`job-row-${job.code}`}>
                <TableCell className="align-top">
                  <div className="font-medium">{job.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {job.code} · {job.owner_service}
                  </div>
                  {!job.target_configured && (
                    <div data-testid="target-not-configured" className="mt-1 text-xs text-destructive">
                      {t(`${ns}.target_not_configured`)}
                    </div>
                  )}
                  {retired && (
                    <Badge variant="outline" className="mt-1">
                      {t(`${ns}.retired`)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  {job.cron_expr ? (
                    <>
                      <code className="font-mono text-xs">{job.cron_expr}</code>
                      {description && <div className="text-xs">{description}</div>}
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">{t(`${ns}.manual_only`)}</span>
                  )}
                  <div className="text-xs text-muted-foreground">{job.timezone}</div>
                  {renderPreview?.(job)}
                </TableCell>
                <TableCell className="align-top text-sm tabular-nums">
                  {job.next_run_at ? formatDateTime(job.next_run_at, locale) : "—"}
                </TableCell>
                <TableCell className="align-top">
                  {job.last_status ? (
                    <StatusBadge status={job.last_status} variant={statusVariant(job.last_status)} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {job.last_run && (
                    <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                      {formatDateTime(job.last_run.finished_at ?? job.last_run.started_at, locale)}
                    </div>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <Badge variant={job.enabled ? "default" : "outline"}>
                    {job.enabled ? t(`${ns}.enabled`) : t(`${ns}.disabled`)}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-1 whitespace-nowrap text-right align-top">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={retired || !job.target_configured || runningCode === job.code}
                    onClick={() => onRun(job)}
                  >
                    {runningCode === job.code ? t(`${ns}.running`) : t(`${ns}.run_now`)}
                  </Button>
                  <Button size="sm" variant="outline" disabled={retired} onClick={() => onEdit(job)}>
                    {t("common.action.edit")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onHistory(job)}>
                    {t(`${ns}.history`)}
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

const TABLE_PREVIEW_COUNT = 3

/** Next activations under the cron cell; silently hidden when the preview call fails. */
function NextRunsPreview({ job }: { job: ScheduledJob }) {
  const { t, locale } = useI18n()
  const preview = useCronPreview(job.cron_expr ?? "", job.timezone, !!job.cron_expr)
  const runs = preview.data?.next_runs?.slice(0, TABLE_PREVIEW_COUNT) ?? []
  if (runs.length === 0) return null
  return (
    <div className="mt-1 text-xs text-muted-foreground tabular-nums" data-testid="next-runs-preview">
      {t("platform.scheduled_jobs.preview_short")}:{" "}
      {runs.map((run) => formatDateTime(run, locale)).join(" · ")}
    </div>
  )
}

/** Tab body: list + "run now" + edit dialog + run-history drawer (`?run=<id>` deep link). */
export function ScheduledJobsTab() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const jobs = useScheduledJobs()
  const runJob = useRunJob()
  const [editing, setEditing] = useState<ScheduledJob | null>(null)
  const [historyCode, setHistoryCode] = useState<string | null>(null)
  const runId = searchParams.get("run")

  const openHistory = useCallback(
    (code: string | null, id: string | null) => {
      setHistoryCode(code)
      const next = new URLSearchParams(searchParams)
      if (id) next.set("run", id)
      else next.delete("run")
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const runNow = (job: ScheduledJob) =>
    runJob.mutate(
      { code: job.code },
      {
        onSuccess: (run) => {
          notify.success(t("platform.scheduled_jobs.run_started", { name: job.name }))
          openHistory(job.code, run.id)
        },
        onError: (error) => {
          if (apiErrorCode(error) === JOB_PROBLEM.alreadyRunning) {
            notify.warning(t("platform.scheduled_jobs.already_running", { name: job.name }))
            return
          }
          notify.error(t("platform.scheduled_jobs.run_failed"), translateApiError(error))
        },
      }
    )

  if (jobs.isError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
        {t("platform.scheduled_jobs.load_failed")}
        <div className="text-xs text-muted-foreground">{translateApiError(jobs.error)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("platform.scheduled_jobs.description")}</p>
      <ScheduledJobsTable
        jobs={jobs.data?.items ?? []}
        loading={jobs.isPending}
        runningCode={runJob.isPending ? (runJob.variables?.code ?? null) : null}
        onEdit={setEditing}
        onRun={runNow}
        onHistory={(job) => openHistory(job.code, null)}
        renderPreview={(job) => <NextRunsPreview job={job} />}
      />
      {editing && (
        <JobEditDialog
          key={`${editing.code}:${editing.version}`}
          job={editing}
          open
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
      <RunHistoryDrawer
        jobCode={historyCode}
        runId={runId}
        open={!!historyCode || !!runId}
        onOpenChange={(open) => !open && openHistory(null, null)}
        onSelectRun={(id) => openHistory(historyCode, id)}
      />
    </div>
  )
}
