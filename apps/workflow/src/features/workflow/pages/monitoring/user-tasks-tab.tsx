import { useCallback, useEffect, useState } from "react"
import { Eye, RefreshCw, UserCheck } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { notify } from "@workspace/ui/feedback/notify"
import { workflowApi } from "../../api"
import type { OperateUserTaskQuery, OperateUserTaskRow } from "../../api"
import { AutoRefreshSelect } from "./auto-refresh"
import { formatDateTime } from "./format"

type DraftFilters = {
  state?: string
  assignee?: string
  candidateGroup?: string
  bpmnProcessId?: string
  processInstanceKey?: string
}

function draftToQuery(draft: DraftFilters): OperateUserTaskQuery {
  return {
    state: draft.state,
    assignee: draft.assignee?.trim() || undefined,
    candidateGroup: draft.candidateGroup?.trim() || undefined,
    bpmnProcessId: draft.bpmnProcessId?.trim() || undefined,
    processInstanceKey: draft.processInstanceKey?.trim() || undefined,
  }
}

function userTaskStateLabel(t: (key: string) => string, state: string): string {
  switch (state) {
    case "CREATED":
      return t("workflow.operate.user_task_state_created")
    case "COMPLETED":
      return t("workflow.operate.instance_state_completed")
    case "CANCELED":
      return t("workflow.operate.instance_state_canceled")
    default:
      return state
  }
}

export function UserTasksTab({
  onOpenInstance,
}: {
  onOpenInstance?: (key: string) => void
}) {
  const { t } = useI18n()
  const [items, setItems] = useState<OperateUserTaskRow[]>([])
  const [cursor, setCursor] = useState<string>()
  const [source, setSource] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [actingKey, setActingKey] = useState<string>()
  const [autoRefresh, setAutoRefresh] = useState(0)
  const [draft, setDraft] = useState<DraftFilters>({ state: "CREATED" })
  const [applied, setApplied] = useState<OperateUserTaskQuery>({
    state: "CREATED",
  })

  const search = useCallback(
    async (query: OperateUserTaskQuery, append: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const page = await workflowApi.searchOperateUserTasks({
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
    void search({ state: "CREATED" }, false)
  }, [search])

  useEffect(() => {
    if (autoRefresh <= 0) return
    const timer = window.setInterval(() => {
      void search(applied, false)
    }, autoRefresh * 1000)
    return () => window.clearInterval(timer)
  }, [applied, autoRefresh, search])

  const handleAssignToMe = async (taskKey: string) => {
    setActingKey(taskKey)
    try {
      await workflowApi.assignUserTask(taskKey)
      notify.success(t("workflow.operate.assign_success"))
      await search(applied, false)
    } catch (reason) {
      notify.error(
        t("workflow.operate.assign_failed"),
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
            <option value="CREATED">
              {t("workflow.operate.user_task_state_created")}
            </option>
            <option value="COMPLETED">
              {t("workflow.operate.instance_state_completed")}
            </option>
            <option value="CANCELED">
              {t("workflow.operate.instance_state_canceled")}
            </option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t("workflow.operate.filter_assignee")}
          <input
            className="h-8 w-40 rounded-md border border-input bg-background px-2 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
            value={draft.assignee ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, assignee: event.target.value })
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t("workflow.operate.filter_candidate_group")}
          <input
            className="h-8 w-40 rounded-md border border-input bg-background px-2 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
            value={draft.candidateGroup ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, candidateGroup: event.target.value })
            }
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
            const query: OperateUserTaskQuery = { state: "CREATED" }
            setDraft({ state: "CREATED" })
            setApplied(query)
            void search(query, false)
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
                {t("workflow.operate.col_user_task")}
              </th>
              <th className="px-3 py-2 text-left">
                {t("workflow.operate.col_process")}
              </th>
              <th className="px-3 py-2 text-left">
                {t("workflow.operate.col_instance_key")}
              </th>
              <th className="px-3 py-2 text-left">
                {t("workflow.operate.col_assignee")}
              </th>
              <th className="px-3 py-2 text-left">
                {t("workflow.operate.col_candidates")}
              </th>
              <th className="px-3 py-2 text-left">
                {t("workflow.operate.col_due")}
              </th>
              <th className="px-3 py-2 text-left">
                {t("workflow.operate.col_status")}
              </th>
              <th className="px-3 py-2 text-right">
                {t("workflow.operate.col_actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((task) => (
              <tr key={task.userTaskKey} className="border-t align-top">
                <td className="px-3 py-2">
                  <div className="font-medium">{task.elementId || "—"}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {task.userTaskKey}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">
                  {task.bpmnProcessId || "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {onOpenInstance ? (
                    <button
                      type="button"
                      className="hover:underline"
                      onClick={() => onOpenInstance(task.processInstanceKey)}
                    >
                      {task.processInstanceKey}
                    </button>
                  ) : (
                    task.processInstanceKey
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  {task.assignee || "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {task.candidateGroups?.join(", ") || "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {task.dueDate ? formatDateTime(task.dueDate) : "—"}
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant={task.state === "CREATED" ? "default" : "secondary"}
                  >
                    {userTaskStateLabel(t, task.state)}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    {onOpenInstance ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => onOpenInstance(task.processInstanceKey)}
                      >
                        <Eye className="size-3.5" />
                        {t("workflow.operate.action_view")}
                      </Button>
                    ) : null}
                    {task.state === "CREATED" && !task.assignee ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 px-2 text-xs"
                        disabled={actingKey === task.userTaskKey}
                        onClick={() => void handleAssignToMe(task.userTaskKey)}
                      >
                        <UserCheck className="size-3.5" />
                        {t("workflow.operate.action_assign_me")}
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-8 text-center text-xs text-muted-foreground"
                >
                  {t("workflow.operate.user_tasks_empty")}
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
