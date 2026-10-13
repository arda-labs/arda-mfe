import { useState } from "react"
import { translateApiError, useI18n } from "@workspace/i18n"
import { formatDateTime } from "@workspace/format"
import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { StatusBadge } from "@workspace/ui/components/status-badge"
import {
  RUNS_PAGE_SIZE,
  extractEvalCases,
  formatDuration,
  formatResultJson,
  statusVariant,
} from "../format"
import { useJobRun, useJobRuns } from "../hooks"
import type { JobStatus, ScheduledJobRun } from "../types"

type Props = {
  jobCode: string | null
  runId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectRun: (id: string) => void
}

const STATUS_FILTERS = ["", "FAILED", "TIMED_OUT", "SUCCEEDED", "RUNNING", "SKIPPED"] as const

/**
 * Run history for one job plus the detail of the selected run. With only a
 * `runId` (notification deep link `?run=<id>`) the job is derived from the run.
 */
export function RunHistoryDrawer({ jobCode, runId, open, onOpenChange, onSelectRun }: Props) {
  const { t } = useI18n()
  const ns = "platform.scheduled_jobs"
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<JobStatus | "">("")
  const detail = useJobRun(runId)
  const effectiveCode = jobCode ?? detail.data?.job_code ?? null
  const runs = useJobRuns(effectiveCode, page, status)
  const items = runs.data?.items ?? []
  const total = runs.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / RUNS_PAGE_SIZE))

  const selectStatus = (next: JobStatus | "") => {
    setStatus(next)
    setPage(1)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-3 overflow-y-auto p-6 sm:max-w-2xl">
        <SheetHeader className="border-b pb-3">
          <SheetTitle>{t(`${ns}.history_title`, { code: effectiveCode ?? "…" })}</SheetTitle>
          <SheetDescription>{t(`${ns}.history_description`)}</SheetDescription>
        </SheetHeader>

        {effectiveCode && (
          <div className="flex flex-wrap gap-1">
            {STATUS_FILTERS.map((filter) => (
              <Button
                key={filter || "all"}
                type="button"
                size="sm"
                variant={status === filter ? "default" : "outline"}
                className="h-7 px-2 text-xs"
                onClick={() => selectStatus(filter)}
              >
                {filter || t(`${ns}.filter_all`)}
              </Button>
            ))}
          </div>
        )}

        {runs.isError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs">
            {translateApiError(runs.error)}
          </div>
        )}

        <ul className="divide-y rounded-md border border-border" data-testid="run-list">
          {runs.isPending && effectiveCode && (
            <li className="p-3 text-center text-xs text-muted-foreground">{t(`${ns}.loading`)}</li>
          )}
          {runs.isSuccess && items.length === 0 && (
            <li className="p-3 text-center text-xs text-muted-foreground">{t(`${ns}.history_empty`)}</li>
          )}
          {items.map((run) => (
            <li key={run.id}>
              <button
                type="button"
                aria-current={run.id === runId ? "true" : undefined}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 ${
                  run.id === runId ? "bg-muted/60" : ""
                }`}
                onClick={() => onSelectRun(run.id)}
              >
                <span className="min-w-0">
                  <span className="tabular-nums">{formatDateTime(run.scheduled_for)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {t(`${ns}.trigger.${run.trigger}`)} · {t(`${ns}.attempt`, { n: run.attempt })}
                  </span>
                </span>
                <StatusBadge status={run.status} variant={statusVariant(run.status)} />
              </button>
            </li>
          ))}
        </ul>

        {total > RUNS_PAGE_SIZE && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t(`${ns}.page_of`, { page, pages: pageCount, total })}</span>
            <div className="space-x-1">
              <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                {t("common.action.prev")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("common.action.next")}
              </Button>
            </div>
          </div>
        )}

        {runId && detail.isError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs">
            {t(`${ns}.run_load_failed`)}: {translateApiError(detail.error)}
          </div>
        )}
        {detail.data && <RunDetail run={detail.data} />}
      </SheetContent>
    </Sheet>
  )
}

function RunDetail({ run }: { run: ScheduledJobRun }) {
  const { t } = useI18n()
  const ns = "platform.scheduled_jobs"
  const cases = extractEvalCases(run.result)
  const resultJson = formatResultJson(run.result)
  const duration = formatDuration(run.started_at, run.finished_at)
  const params = Object.entries(run.params ?? {})
  return (
    <section className="space-y-2 rounded-md border border-border p-3 text-sm" data-testid="run-detail">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={run.status} variant={statusVariant(run.status)} />
        <span className="text-xs text-muted-foreground">
          {t(`${ns}.trigger.${run.trigger}`)} · {t(`${ns}.attempt`, { n: run.attempt })}
          {duration ? ` · ${duration}` : ""}
        </span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">{t(`${ns}.run.id`)}</dt>
        <dd className="font-mono break-all">{run.id}</dd>
        <dt className="text-muted-foreground">{t(`${ns}.run.scheduled_for`)}</dt>
        <dd className="tabular-nums">{formatDateTime(run.scheduled_for)}</dd>
        <dt className="text-muted-foreground">{t(`${ns}.run.started_at`)}</dt>
        <dd className="tabular-nums">{formatDateTime(run.started_at)}</dd>
        <dt className="text-muted-foreground">{t(`${ns}.run.finished_at`)}</dt>
        <dd className="tabular-nums">{formatDateTime(run.finished_at)}</dd>
        <dt className="text-muted-foreground">{t(`${ns}.run.triggered_by`)}</dt>
        <dd className="font-mono break-all">{run.triggered_by || "—"}</dd>
        {params.length > 0 && (
          <>
            <dt className="text-muted-foreground">{t(`${ns}.run.params`)}</dt>
            <dd className="font-mono break-all">
              {params.map(([key, value]) => `${key}=${value}`).join(", ")}
            </dd>
          </>
        )}
      </dl>
      {(run.error_code || run.error_message) && (
        <pre className="whitespace-pre-wrap rounded bg-destructive/10 p-2 text-xs text-destructive" data-testid="run-error">
          {[run.error_code, run.error_message].filter(Boolean).join(": ")}
        </pre>
      )}
      {cases.length > 0 && (
        <table className="w-full text-xs" data-testid="eval-cases">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">{t(`${ns}.cases.id`)}</th>
              <th className="py-1 font-medium">{t(`${ns}.cases.passed`)}</th>
              <th className="py-1 font-medium">{t(`${ns}.cases.recall`)}</th>
              <th className="py-1 font-medium">{t(`${ns}.cases.error`)}</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((item) => (
              <tr key={item.id} className="border-t border-border/60">
                <td className="py-1 font-mono">{item.id}</td>
                <td className={`py-1 ${item.passed ? "text-success" : "text-destructive"}`}>
                  {item.passed ? t(`${ns}.cases.pass`) : t(`${ns}.cases.fail`)}
                </td>
                <td className="py-1 tabular-nums">{item.recall !== undefined ? item.recall.toFixed(2) : "—"}</td>
                <td className="py-1 text-muted-foreground">{item.error ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {resultJson && (
        <details className="text-xs">
          <summary className="cursor-pointer select-none text-muted-foreground">{t(`${ns}.run.result`)}</summary>
          <pre className="mt-1 max-h-72 overflow-auto rounded bg-muted/40 p-2">{resultJson}</pre>
        </details>
      )}
    </section>
  )
}
