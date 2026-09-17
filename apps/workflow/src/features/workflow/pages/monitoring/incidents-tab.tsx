import { useCallback, useEffect, useState } from "react"
import { Eye, RefreshCw } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
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
import type { OperateIncidentQuery, OperateIncidentRow } from "../../api"
import { InstanceDetail } from "./instance-detail"
import { formatDateTime, toIsoRange } from "./format"

type DraftFilters = {
  state?: string
  errorType?: string
  bpmnProcessId?: string
  processInstanceKey?: string
  fromDate?: string
  toDate?: string
}

function draftToQuery(draft: DraftFilters): OperateIncidentQuery {
  return {
    state: draft.state,
    errorType: draft.errorType?.trim() || undefined,
    bpmnProcessId: draft.bpmnProcessId?.trim() || undefined,
    processInstanceKey: draft.processInstanceKey?.trim() || undefined,
    from: toIsoRange(draft.fromDate),
    to: toIsoRange(draft.toDate, true),
  }
}

function IncidentStateBadge({ state }: { state: string }) {
  const { t } = useI18n()
  const label =
    state === "CREATED"
      ? t("workflow.operate.incident_state_created")
      : state === "RESOLVED"
        ? t("workflow.operate.incident_state_resolved")
        : state
  return (
    <Badge variant={state === "CREATED" ? "destructive" : "secondary"}>
      {label}
    </Badge>
  )
}

export function IncidentsTab({
  onOpenInstance,
}: {
  onOpenInstance?: (key: string) => void
}) {
  const { t } = useI18n()
  const [selectedKey, setSelectedKey] = useState<string>()
  const [items, setItems] = useState<OperateIncidentRow[]>([])
  const [cursor, setCursor] = useState<string>()
  const [source, setSource] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [actingKey, setActingKey] = useState<string>()
  const [draft, setDraft] = useState<DraftFilters>({ state: "CREATED" })
  const [applied, setApplied] = useState<OperateIncidentQuery>({
    state: "CREATED",
  })

  const search = useCallback(
    async (query: OperateIncidentQuery, append: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const page = await monitoringApi.searchOperateIncidents({
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

  const applyFilters = () => {
    const query = draftToQuery(draft)
    setApplied(query)
    void search(query, false)
  }

  const resetFilters = () => {
    const query: OperateIncidentQuery = { state: "CREATED" }
    setDraft({ state: "CREATED" })
    setApplied(query)
    void search(query, false)
  }

  const handleRetry = async (incidentKey: string) => {
    setActingKey(incidentKey)
    try {
      await monitoringApi.retryIncident(incidentKey)
      notify.success(t("workflow.operate.retry_incident_success"))
      await search(applied, false)
    } catch (reason) {
      notify.error(
        t("workflow.operate.retry_failed"),
        reason instanceof Error ? reason.message : undefined
      )
    } finally {
      setActingKey(undefined)
    }
  }

  const handleResolve = async (incidentKey: string) => {
    setActingKey(incidentKey)
    try {
      await monitoringApi.resolveIncident(incidentKey)
      notify.success(t("workflow.operate.resolve_incident_success"))
      await search(applied, false)
    } catch (reason) {
      notify.error(
        t("workflow.operate.resolve_failed"),
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
              {t("workflow.operate.incident_state_created")}
            </option>
            <option value="RESOLVED">
              {t("workflow.operate.incident_state_resolved")}
            </option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t("workflow.operate.filter_error_type")}
          <input
            className="h-8 w-40 rounded-md border border-input bg-background px-2 font-mono text-xs focus:ring-1 focus:ring-ring focus:outline-none"
            value={draft.errorType ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, errorType: event.target.value })
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
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t("workflow.operate.filter_from")}
          <input
            type="date"
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
            value={draft.fromDate ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, fromDate: event.target.value })
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {t("workflow.operate.filter_to")}
          <input
            type="date"
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
            value={draft.toDate ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, toDate: event.target.value })
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
          <Button size="sm" variant="outline" onClick={() => void search(applied, false)}>
            {t("common.action.retry")}
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>{t("workflow.operate.col_created")}</TableHead>
              <TableHead>{t("workflow.operate.col_error_type")}</TableHead>
              <TableHead>{t("workflow.operate.col_process")}</TableHead>
              <TableHead>
                {t("workflow.operate.col_instance_key")}
              </TableHead>
              <TableHead>
                {t("workflow.operate.col_business_key")}
              </TableHead>
              <TableHead>{t("workflow.operate.col_status")}</TableHead>
              <TableHead className="text-right">
                {t("workflow.operate.col_actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((incident) => (
              <TableRow key={incident.incidentKey}>
                <TableCell className="text-xs">
                  {formatDateTime(incident.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {incident.errorType || t("workflow.operate.unknown_error")}
                  </div>
                  <p className="max-w-[18rem] truncate text-xs text-muted-foreground" title={incident.errorMessage}>
                    {incident.errorMessage || "—"}
                  </p>
                </TableCell>
                <TableCell className="text-xs">
                  <div>{incident.bpmnProcessId || "—"}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {incident.elementId || ""}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() => openInstance(incident.processInstanceKey)}
                  >
                    {incident.processInstanceKey}
                  </button>
                </TableCell>
                <TableCell className="text-xs">
                  {incident.businessKey || "—"}
                </TableCell>
                <TableCell>
                  <IncidentStateBadge state={incident.state} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() => openInstance(incident.processInstanceKey)}
                    >
                      <Eye className="size-3.5" />
                      {t("workflow.operate.action_view")}
                    </Button>
                    {incident.state === "CREATED" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={actingKey === incident.incidentKey}
                          onClick={() => void handleRetry(incident.incidentKey)}
                        >
                          {t("workflow.operate.actions_retry")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          disabled={actingKey === incident.incidentKey}
                          onClick={() => void handleResolve(incident.incidentKey)}
                        >
                          {t("workflow.operate.actions_resolve")}
                        </Button>
                      </>
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
                  {t("workflow.operate.empty_incidents")}
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
