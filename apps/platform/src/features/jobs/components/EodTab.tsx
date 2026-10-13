import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { translateApiError, useI18n } from "@workspace/i18n"
import { todayISO } from "@workspace/format"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DateField } from "@workspace/ui/components/date-field"
import { Label } from "@workspace/ui/components/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { listJobRuns, listJobs, runCob, seedCob } from "../api"
import { type JobDefinition, type JobRun } from "../types"
import type { ScheduledJobRun } from "../../scheduled-jobs/types"
import { scheduledRunHref } from "../tabs"

function runStatusVariant(status: string) {
  if (status === "DONE") return "default" as const
  if (status === "FAILED") return "destructive" as const
  return "secondary" as const
}

/** COB step definitions, the manual EOD trigger and the legacy EOD history (W6). */
export function EodTab() {
  const { t } = useI18n()
  const [jobs, setJobs] = useState<JobDefinition[]>([])
  const [runs, setRuns] = useState<JobRun[]>([])
  const [businessDate, setBusinessDate] = useState(todayISO())
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [startedRun, setStartedRun] = useState<ScheduledJobRun | null>(null)
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const [jobList, runList] = await Promise.all([listJobs(), listJobRuns({ limit: 100 })])
      setJobs(jobList.items)
      setRuns(runList.items)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const run = async () => {
    setRunning(true)
    setStartedRun(null)
    try {
      const started = await runCob(businessDate)
      setStartedRun(started)
      notify.success(t("platform.jobs.run_started"))
    } catch (error) {
      notify.error(t("platform.jobs.run_failed"), translateApiError(error))
    } finally {
      setRunning(false)
    }
  }

  const seed = async () => {
    try {
      await seedCob()
      notify.success(t("platform.jobs.seed_success"))
      await load()
    } catch (error) {
      notify.error(t("platform.jobs.seed_failed"), translateApiError(error))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("platform.jobs.description")}</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="eod-business-date">{t("platform.jobs.field.business_date")}</Label>
            <DateField
              id="eod-business-date"
              value={businessDate}
              onChange={(e) => setBusinessDate(e.target.value)}
            />
          </div>
          <Button onClick={() => void run()} disabled={running}>
            {t("platform.jobs.run_eod")}
          </Button>
          <Button variant="outline" onClick={() => void seed()}>
            {t("platform.jobs.seed")}
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {t("platform.jobs.load_failed")}
        </div>
      )}

      {startedRun && (
        <div className="rounded-lg border border-border p-3 text-sm" data-testid="eod-run-started">
          <div className="font-medium">
            {t("platform.jobs.run_started_for", {
              date: startedRun.params?.business_date ?? businessDate,
            })}
          </div>
          <Link className="text-primary underline-offset-2 hover:underline" to={scheduledRunHref(startedRun.id)}>
            {t("platform.jobs.view_run")}
          </Link>
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{t("platform.jobs.definitions")}</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{t("platform.jobs.col.code")}</TableHead>
                <TableHead>{t("platform.jobs.col.name")}</TableHead>
                <TableHead>{t("platform.jobs.col.sequence")}</TableHead>
                <TableHead>{t("platform.jobs.col.endpoint")}</TableHead>
                <TableHead>{t("common.field.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                    {t("platform.jobs.loading")}
                  </TableCell>
                </TableRow>
              )}
              {!loading && jobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                    {t("platform.jobs.empty")}
                  </TableCell>
                </TableRow>
              )}
              {jobs.map((job) => (
                <TableRow key={job.code}>
                  <TableCell className="font-mono text-xs font-semibold text-primary">
                    {job.code}
                  </TableCell>
                  <TableCell>{job.name}</TableCell>
                  <TableCell className="tabular-nums">{job.sequence}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {job.endpoint}
                  </TableCell>
                  <TableCell>
                    <Badge variant={job.is_enabled ? "default" : "outline"}>
                      {job.is_enabled ? t("platform.jobs.enabled") : t("platform.jobs.disabled")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{t("platform.jobs.history")}</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{t("platform.jobs.col.code")}</TableHead>
                <TableHead>{t("platform.jobs.field.business_date")}</TableHead>
                <TableHead>{t("common.field.status")}</TableHead>
                <TableHead>{t("platform.jobs.col.error")}</TableHead>
                <TableHead>{t("platform.jobs.col.finished")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                    {t("platform.jobs.empty")}
                  </TableCell>
                </TableRow>
              )}
              {runs.map((row, index) => (
                <TableRow key={`${row.job_code}-${row.business_date}-${index}`}>
                  <TableCell className="font-mono text-xs">{row.job_code}</TableCell>
                  <TableCell>{row.business_date}</TableCell>
                  <TableCell>
                    <Badge variant={runStatusVariant(row.status)}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">
                    {row.error || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.finished_at || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
