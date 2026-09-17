import { useCallback, useEffect, useState } from "react"
import { Eye, RefreshCw } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { notify } from "@workspace/ui/feedback/notify"
import { monitoringApi } from "../../api"
import type { JobDefinitionState, OperateJob, OperateJobQuery } from "../../api"
import { InstanceDetail } from "./instance-detail"
import { AutoRefreshSelect } from "./auto-refresh"
import { formatDateTime } from "./format"
import { jobStateLabel } from "./job-state"

const JOB_STATES = [
  "ACTIVATABLE",
  "FAILED",
  "COMPLETED",
  "ERROR_THROWN",
  "CANCELED",
  "TIMED_OUT",
] as const

type DraftFilters = {
  state?: string
  type?: string
  bpmnProcessId?: string
  processInstanceKey?: string
}

function draftToQuery(draft: DraftFilters): OperateJobQuery {
  return {
    state: draft.state,
    type: draft.type?.trim() || undefined,
    bpmnProcessId: draft.bpmnProcessId?.trim() || undefined,
    processInstanceKey: draft.processInstanceKey?.trim() || undefined,
  }
}

export function JobsTab({
  onOpenInstance,
}: {
  onOpenInstance?: (key: string) => void
}) {
  const { t } = useI18n()
  const [view, setView] = useState<"runtime" | "definitions">("runtime")
  const [selectedKey, setSelectedKey] = useState<string>()
  const [items, setItems] = useState<OperateJob[]>([])
  const [definitions, setDefinitions] = useState<JobDefinitionState[]>([])
  const [definitionsLoading, setDefinitionsLoading] = useState(false)
  const [cursor, setCursor] = useState<string>()
  const [source, setSource] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [actingKey, setActingKey] = useState<string>()
  const [autoRefresh, setAutoRefresh] = useState(0)
  const [draft, setDraft] = useState<DraftFilters>({})
  const [applied, setApplied] = useState<OperateJobQuery>({})

  const search = useCallback(
    async (query: OperateJobQuery, append: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const page = await monitoringApi.searchOperateJobs({
          ...query,
          pageSize: 25,
        })
        setItems((previous) => (append ? [...previous, ...page.items] : page.items))
        setCursor(page.nextCursor)
        setSource(page.source)
      } catch (reason) {
        setError(reason)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    void search({}, false)
  }, [search])

  useEffect(() => {
    if (autoRefresh <= 0) return
    const timer = window.setInterval(() => {
      void search(applied, false)
    }, autoRefresh * 1000)
    return () => window.clearInterval(timer)
  }, [applied, autoRefresh, search])

  const loadDefinitions = useCallback(async (bpmnProcessId?: string) => {
    setDefinitionsLoading(true)
    try {
      setDefinitions(await monitoringApi.listOperateJobDefinitions(bpmnProcessId))
    } catch {
      setDefinitions([])
    } finally {
      setDefinitionsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (view === "definitions") void loadDefinitions()
  }, [view, loadDefinitions])

  const openInstance = (key: string) => {
    if (onOpenInstance) onOpenInstance(key)
    else setSelectedKey(key)
  }

  if (selectedKey) {
    return (
      <InstanceDetail
        instanceKey={selectedKey}
        onBack={() => setSelectedKey(undefined)}
      />
    )
  }

  const viewToggle = (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant={view === "runtime" ? "secondary" : "ghost"}
        className="h-7 px-2 text-xs"
        onClick={() => setView("runtime")}
      >
        {t("workflow.operate.jobs_view_runtime")}
      </Button>
      <Button
        size="sm"
        variant={view === "definitions" ? "secondary" : "ghost"}
        className="h-7 px-2 text-xs"
        onClick={() => setView("definitions")}
      >
        {t("workflow.operate.jobs_view_definitions")}
      </Button>
    </div>
  )

  if (view === "definitions") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
        {viewToggle}
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t("workflow.operate.filter_bpmn_process")}
            <input
              className="h-8 w-44 rounded-md border border-input bg-background px-2 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
              value={draft.bpmnProcessId ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, bpmnProcessId: event.target.value })
              }
            />
          </label>
          <Button
            size="sm"
            onClick={() => void loadDefinitions(draft.bpmnProcessId?.trim())}
          >
            {t("workflow.operate.filter_apply")}
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="size-8"
            title={t("workflow.operate.refresh")}
            disabled={definitionsLoading}
            onClick={() => void loadDefinitions(draft.bpmnProcessId?.trim())}
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>{t("workflow.operate.detail_job_type")}</TableHead>
                <TableHead>{t("workflow.operate.col_element")}</TableHead>
                <TableHead>{t("workflow.operate.col_process")}</TableHead>
                <TableHead>
                  {t("workflow.operate.detail_job_retries")}
                </TableHead>
                <TableHead>{t("workflow.operate.col_status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {definitions.map((definition) => (
                <TableRow key={definition.jobDefinitionKey}>
                  <TableCell className="font-mono text-xs font-medium">
                    {definition.type}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{definition.elementName || definition.elementId}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {definition.elementId}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {definition.bpmnProcessId}
                    {definition.version ? ` · v${definition.version}` : ""}
                  </TableCell>
                  <TableCell className="text-xs">{definition.retries}</TableCell>
                  <TableCell className="text-xs">
                    {definition.state === "ACTIVE"
                      ? t("workflow.operate.job_def_state_active")
                      : t("workflow.operate.job_def_state_suspended")}
                  </TableCell>
                </TableRow>
              ))}
              {!definitionsLoading && definitions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-xs text-muted-foreground"
                  >
                    {t("workflow.operate.empty_job_definitions")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  const handleUpdateRetries = async (jobKey: string) => {
    setActingKey(jobKey)
    try {
      await monitoringApi.updateJobRetries(jobKey, 3)
      notify.success(t("workflow.operate.retry_job_success"))
      await search(applied, false)
    } catch (reason) {
      notify.error(
        t("workflow.operate.retry_job_failed"),
        reason instanceof Error ? reason.message : undefined
      )
    } finally {
      setActingKey(undefined)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
      {viewToggle}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t("workflow.operate.filter_state")}
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
            value={draft.state ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, state: event.target.value || undefined })
            }
          >
            <option value="">{t("workflow.operate.filter_all_states")}</option>
            {JOB_STATES.map((state) => (
              <option key={state} value={state}>
                {jobStateLabel(t, state)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t("workflow.operate.filter_job_type")}
          <input
            className="h-8 w-48 rounded-md border border-input bg-background px-2 font-mono text-xs focus:ring-1 focus:ring-ring focus:outline-none"
            value={draft.type ?? ""}
            onChange={(event) => setDraft({ ...draft, type: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t("workflow.operate.filter_bpmn_process")}
          <input
            className="h-8 w-44 rounded-md border border-input bg-background px-2 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
            value={draft.bpmnProcessId ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, bpmnProcessId: event.target.value })
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t("workflow.operate.filter_instance_key")}
          <input
            className="h-8 w-40 rounded-md border border-input bg-background px-2 font-mono text-xs focus:ring-1 focus:ring-ring focus:outline-none"
            value={draft.processInstanceKey ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, processInstanceKey: event.target.value })
            }
          />
        </label>
        <Button
          size="sm"
          onClick={() => {
            const query = draftToQuery(draft)
            setApplied(query)
            void search(query, false)
          }}
        >
          {t("workflow.operate.filter_apply")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setDraft({})
            setApplied({})
            void search({}, false)
          }}
        >
          {t("workflow.operate.filter_reset")}
        </Button>
        <AutoRefreshSelect value={autoRefresh} onChange={setAutoRefresh} />
        <Button
          size="icon"
          variant="outline"
          className="size-8"
          title={t("workflow.operate.refresh")}
          onClick={() => void search(applied, false)}
        >
          <RefreshCw className="size-3.5" />
        </Button>
      </div>

      {source === "unavailable" ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {t("workflow.operate.source_unavailable")}
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <span>
            {t("workflow.operate.monitoring_load_failed")}
            {error instanceof Error ? `: ${error.message}` : ""}
          </span>
          <Button size="sm" variant="outline" onClick={() => void search(applied, false)}>
            {t("common.action.retry")}
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>{t("workflow.operate.detail_job_type")}</TableHead>
              <TableHead>{t("workflow.operate.col_status")}</TableHead>
              <TableHead>
                {t("workflow.operate.detail_job_retries")}
              </TableHead>
              <TableHead>{t("workflow.operate.col_element")}</TableHead>
              <TableHead>
                {t("workflow.operate.col_instance_key")}
              </TableHead>
              <TableHead>{t("workflow.operate.col_created")}</TableHead>
              <TableHead className="text-right">
                {t("workflow.operate.col_actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((job) => (
              <TableRow key={job.jobKey}>
                <TableCell>
                  <div className="font-mono text-xs font-medium">{job.type}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {job.bpmnProcessId || ""}
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  {jobStateLabel(t, job.state)}
                </TableCell>
                <TableCell className="text-xs">{job.retries}</TableCell>
                <TableCell className="font-mono text-[10px] text-muted-foreground">
                  {job.elementId || "—"}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() => openInstance(job.processInstanceKey)}
                  >
                    {job.processInstanceKey}
                  </button>
                </TableCell>
                <TableCell className="text-xs">
                  {formatDateTime(job.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() => openInstance(job.processInstanceKey)}
                    >
                      <Eye className="size-3.5" />
                      {t("workflow.operate.action_view")}
                    </Button>
                    {job.state === "FAILED" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        disabled={actingKey === job.jobKey}
                        onClick={() => void handleUpdateRetries(job.jobKey)}
                      >
                        {t("workflow.operate.detail_update_retries")}
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-xs text-muted-foreground"
                >
                  {t("workflow.operate.empty_jobs")}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {loading ? t("workflow.operate.monitoring_loading") : `${items.length}`}
        </span>
        {cursor ? (
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => void search({ ...applied, cursor }, true)}
          >
            {t("workflow.operate.load_more")}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
