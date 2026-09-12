import { useCallback, useEffect, useState } from "react"
import { Eye, RefreshCw } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { notify } from "@workspace/ui/feedback/notify"
import { workflowApi } from "../../api"
import type { OperateJob, OperateJobQuery } from "../../api"
import { InstanceDetail } from "./instance-detail"
import { AutoRefreshSelect } from "./auto-refresh"
import { formatDateTime } from "./format"

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
  const [selectedKey, setSelectedKey] = useState<string>()
  const [items, setItems] = useState<OperateJob[]>([])
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
        const page = await workflowApi.searchOperateJobs({
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

  const handleUpdateRetries = async (jobKey: string) => {
    setActingKey(jobKey)
    try {
      await workflowApi.updateJobRetries(jobKey, 3)
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
                {state}
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
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">
                {t("workflow.operate.detail_job_type")}
              </th>
              <th className="px-3 py-2 text-left">
                {t("workflow.operate.col_status")}
              </th>
              <th className="px-3 py-2 text-left">
                {t("workflow.operate.detail_job_retries")}
              </th>
              <th className="px-3 py-2 text-left">
                {t("workflow.operate.col_element")}
              </th>
              <th className="px-3 py-2 text-left">
                {t("workflow.operate.col_instance_key")}
              </th>
              <th className="px-3 py-2 text-left">
                {t("workflow.operate.col_created")}
              </th>
              <th className="px-3 py-2 text-right">
                {t("workflow.operate.col_actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((job) => (
              <tr key={job.jobKey} className="border-t align-top">
                <td className="px-3 py-2">
                  <div className="font-mono text-xs font-medium">{job.type}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {job.bpmnProcessId || ""}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">{job.state}</td>
                <td className="px-3 py-2 text-xs">{job.retries}</td>
                <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                  {job.elementId || "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() => openInstance(job.processInstanceKey)}
                  >
                    {job.processInstanceKey}
                  </button>
                </td>
                <td className="px-3 py-2 text-xs">
                  {formatDateTime(job.createdAt)}
                </td>
                <td className="px-3 py-2">
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
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-xs text-muted-foreground"
                >
                  {t("workflow.operate.empty_jobs")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
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
