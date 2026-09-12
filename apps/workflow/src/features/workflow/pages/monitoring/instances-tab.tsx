import { useCallback, useEffect, useState } from "react"
import { Eye, RefreshCw } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { workflowApi } from "../../api"
import type { OperateInstance, OperateInstanceQuery } from "../../api"
import { InstanceDetail } from "./instance-detail"
import { InstanceStateBadge } from "./state-badge"
import { formatDateTime, formatDuration, toIsoRange } from "./format"

type DraftFilters = {
  state?: string
  bpmnProcessId?: string
  processInstanceKey?: string
  startFromDate?: string
  startToDate?: string
}

function draftToQuery(draft: DraftFilters): OperateInstanceQuery {
  return {
    state: draft.state,
    bpmnProcessId: draft.bpmnProcessId?.trim() || undefined,
    processInstanceKey: draft.processInstanceKey?.trim() || undefined,
    startFrom: toIsoRange(draft.startFromDate),
    startTo: toIsoRange(draft.startToDate, true),
  }
}

export function InstancesTab() {
  const { t } = useI18n()
  const [selectedKey, setSelectedKey] = useState<string>()
  const [items, setItems] = useState<OperateInstance[]>([])
  const [cursor, setCursor] = useState<string>()
  const [source, setSource] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [draft, setDraft] = useState<DraftFilters>({})
  const [applied, setApplied] = useState<OperateInstanceQuery>({})

  const search = useCallback(
    async (query: OperateInstanceQuery, append: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const page = await workflowApi.searchOperateInstances({
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

  if (selectedKey) {
    return (
      <InstanceDetail
        instanceKey={selectedKey}
        onBack={() => setSelectedKey(undefined)}
      />
    )
  }

  const applyFilters = () => {
    const query = draftToQuery(draft)
    setApplied(query)
    void search(query, false)
  }

  const resetFilters = () => {
    setDraft({})
    setApplied({})
    void search({}, false)
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
            <option value="ACTIVE">
              {t("workflow.operate.instance_state_active")}
            </option>
            <option value="COMPLETED">
              {t("workflow.operate.instance_state_completed")}
            </option>
            <option value="TERMINATED">
              {t("workflow.operate.state_terminated")}
            </option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t("workflow.operate.filter_bpmn_process")}
          <input
            className="h-8 w-44 rounded-md border border-input bg-background px-2 text-xs placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none"
            value={draft.bpmnProcessId ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, bpmnProcessId: event.target.value })
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t("workflow.operate.filter_instance_key")}
          <input
            className="h-8 w-40 rounded-md border border-input bg-background px-2 font-mono text-xs placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none"
            value={draft.processInstanceKey ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, processInstanceKey: event.target.value })
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t("workflow.operate.filter_from")}
          <input
            type="date"
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
            value={draft.startFromDate ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, startFromDate: event.target.value })
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t("workflow.operate.filter_to")}
          <input
            type="date"
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
            value={draft.startToDate ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, startToDate: event.target.value })
            }
          />
        </label>
        <Button size="sm" onClick={applyFilters}>
          {t("workflow.operate.filter_apply")}
        </Button>
        <Button size="sm" variant="outline" onClick={resetFilters}>
          {t("workflow.operate.filter_reset")}
        </Button>
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

      {source === "database" ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {t("workflow.operate.source_database")}
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <span>
            {t("workflow.operate.monitoring_load_failed")}
            {error instanceof Error ? `: ${error.message}` : ""}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void search(applied, false)}
          >
            {t("common.action.retry")}
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">
                {t("workflow.operate.col_instance_key")}
              </th>
              <th className="px-3 py-2 text-left">
                {t("workflow.operate.col_process")}
              </th>
              <th className="px-3 py-2 text-left">
                {t("workflow.operate.col_business_key")}
              </th>
              <th className="px-3 py-2 text-left">
                {t("workflow.operate.col_status")}
              </th>
              <th className="px-3 py-2 text-left">
                {t("workflow.operate.col_started")}
              </th>
              <th className="px-3 py-2 text-left">
                {t("workflow.operate.col_ended")}
              </th>
              <th className="px-3 py-2 text-left">
                {t("workflow.operate.col_duration")}
              </th>
              <th className="px-3 py-2 text-right">
                {t("workflow.operate.col_actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.processInstanceKey} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() => setSelectedKey(item.processInstanceKey)}
                  >
                    {item.processInstanceKey}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium">{item.bpmnProcessId}</div>
                  <div className="text-xs text-muted-foreground">
                    v{item.version}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">
                  {item.businessKey || "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <InstanceStateBadge state={item.state} />
                    {item.openIncidents > 0 ? (
                      <Badge variant="destructive">{item.openIncidents}</Badge>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">
                  {formatDateTime(item.startTime)}
                </td>
                <td className="px-3 py-2 text-xs">
                  {item.endTime ? formatDateTime(item.endTime) : "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {formatDuration(item.startTime, item.endTime)}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => setSelectedKey(item.processInstanceKey)}
                  >
                    <Eye className="size-3.5" />
                    {t("workflow.operate.action_view")}
                  </Button>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-8 text-center text-xs text-muted-foreground"
                >
                  {t("workflow.operate.empty_instances")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {loading
            ? t("workflow.operate.monitoring_loading")
            : `${items.length}`}
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
