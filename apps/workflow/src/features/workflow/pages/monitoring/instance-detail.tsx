import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, RefreshCw, XCircle } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { notify } from "@workspace/ui/feedback/notify"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { OperateBpmnViewer } from "../../components/bpmn-monitor-lazy"
import { workflowApi } from "../../api"
import type {
  ElementInstanceStat,
  OperateElementInstance,
  OperateHistoryEvent,
  OperateIncidentRow,
  OperateInstanceDetail,
  OperateJob,
  OperateVariable,
} from "../../api"
import { InstanceStateBadge } from "./state-badge"
import { AutoRefreshSelect } from "./auto-refresh"
import { formatDateTime, formatDuration } from "./format"

type DetailTab = "variables" | "incidents" | "jobs" | "history"

export function InstanceDetail({
  instanceKey,
  onBack,
}: {
  instanceKey: string
  onBack: () => void
}) {
  const { t } = useI18n()
  const [detail, setDetail] = useState<OperateInstanceDetail | null>(null)
  const [elements, setElements] = useState<OperateElementInstance[]>([])
  const [variables, setVariables] = useState<OperateVariable[]>([])
  const [incidents, setIncidents] = useState<OperateIncidentRow[]>([])
  const [jobs, setJobs] = useState<OperateJob[]>([])
  const [history, setHistory] = useState<OperateHistoryEvent[]>([])
  const [historyCursor, setHistoryCursor] = useState<string>()
  const [historyLoading, setHistoryLoading] = useState(false)
  const [xml, setXml] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [tab, setTab] = useState<DetailTab>("variables")
  const [autoRefresh, setAutoRefresh] = useState(0)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [detailData, elementData, variableData, incidentPage, jobData, historyPage] =
        await Promise.all([
          workflowApi.getOperateInstanceDetail(instanceKey),
          workflowApi.listInstanceElementInstances(instanceKey),
          workflowApi.listInstanceVariables(instanceKey),
          workflowApi.searchOperateIncidents({
            processInstanceKey: instanceKey,
            state: "CREATED",
            pageSize: 100,
          }),
          workflowApi.listInstanceJobs(instanceKey),
          workflowApi.listInstanceHistory(instanceKey),
        ])
      setDetail(detailData)
      setElements(elementData)
      setVariables(variableData)
      setIncidents(incidentPage.items)
      setJobs(jobData)
      setHistory(historyPage.items)
      setHistoryCursor(historyPage.nextCursor)

      const definitions = await workflowApi.listProcessDefinitions()
      const definition = definitions
        .filter((item) => item.bpmnProcessId === detailData.bpmnProcessId)
        .sort((a, b) => b.version - a.version)[0]
      if (definition) {
        setXml(
          definition.xmlContent ||
            (await workflowApi.getProcessDefinitionXml(definition.id))
        )
      } else {
        setXml("")
      }
    } catch (reason) {
      setError(reason)
    } finally {
      setLoading(false)
    }
  }, [instanceKey])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (autoRefresh <= 0) return
    const timer = window.setInterval(() => {
      void load()
    }, autoRefresh * 1000)
    return () => window.clearInterval(timer)
  }, [autoRefresh, load])

  const loadMoreHistory = useCallback(async () => {
    if (!historyCursor) return
    setHistoryLoading(true)
    try {
      const page = await workflowApi.listInstanceHistory(
        instanceKey,
        historyCursor
      )
      setHistory((previous) => [...previous, ...page.items])
      setHistoryCursor(page.nextCursor)
    } catch (reason) {
      notify.error(
        t("workflow.operate.monitoring_load_failed"),
        reason instanceof Error ? reason.message : undefined
      )
    } finally {
      setHistoryLoading(false)
    }
  }, [historyCursor, instanceKey, t])

  const elementStats = useMemo(() => {
    const stats = new Map<string, ElementInstanceStat>()
    for (const element of elements) {
      if (!element.elementId) continue
      const stat = stats.get(element.elementId) ?? {
        bpmnProcessId: detail?.bpmnProcessId ?? "",
        elementId: element.elementId,
        elementName: element.elementId,
        elementType: element.bpmnElementType,
        activeCount: 0,
        completedCount: 0,
        incidentCount: 0,
        totalCount: 0,
      }
      stat.totalCount += 1
      if (element.state === "ACTIVE") stat.activeCount += 1
      if (element.state === "COMPLETED") stat.completedCount += 1
      stats.set(element.elementId, stat)
    }
    for (const incident of incidents) {
      if (!incident.elementId) continue
      const stat = stats.get(incident.elementId)
      if (stat) stat.incidentCount += 1
    }
    return stats
  }, [elements, incidents, detail?.bpmnProcessId])

  const highlightId = useMemo(
    () => elements.find((element) => element.state === "ACTIVE")?.elementId,
    [elements]
  )

  const handleCancel = useCallback(async () => {
    setActing(true)
    try {
      await workflowApi.cancelProcessInstance(instanceKey)
      notify.success(t("workflow.operate.cancel_success"))
      setCancelOpen(false)
      await load()
    } catch (reason) {
      notify.error(
        t("workflow.operate.cancel_failed"),
        reason instanceof Error ? reason.message : undefined
      )
    } finally {
      setActing(false)
    }
  }, [instanceKey, load, t])

  const handleRetryIncident = useCallback(
    async (incidentKey: string) => {
      setActing(true)
      try {
        await workflowApi.retryIncident(incidentKey)
        notify.success(t("workflow.operate.retry_incident_success"))
        await load()
      } catch (reason) {
        notify.error(
          t("workflow.operate.retry_failed"),
          reason instanceof Error ? reason.message : undefined
        )
      } finally {
        setActing(false)
      }
    },
    [load, t]
  )

  const handleResolveIncident = useCallback(
    async (incidentKey: string) => {
      setActing(true)
      try {
        await workflowApi.resolveIncident(incidentKey)
        notify.success(t("workflow.operate.resolve_incident_success"))
        await load()
      } catch (reason) {
        notify.error(
          t("workflow.operate.resolve_failed"),
          reason instanceof Error ? reason.message : undefined
        )
      } finally {
        setActing(false)
      }
    },
    [load, t]
  )

  const handleUpdateRetries = useCallback(
    async (jobKey: string) => {
      setActing(true)
      try {
        await workflowApi.updateJobRetries(jobKey, 3)
        notify.success(t("workflow.operate.retry_job_success"))
        await load()
      } catch (reason) {
        notify.error(
          t("workflow.operate.retry_job_failed"),
          reason instanceof Error ? reason.message : undefined
        )
      } finally {
        setActing(false)
      }
    },
    [load, t]
  )

  if (loading && !detail) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        {t("workflow.operate.monitoring_loading")}
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-destructive">
          {t("workflow.operate.monitoring_load_failed")}
          {error instanceof Error ? `: ${error.message}` : ""}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-1 size-3.5" />
            {t("workflow.operate.action_back")}
          </Button>
          <Button size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-1 size-3.5" />
            {t("workflow.operate.refresh")}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onBack}
            title={t("workflow.operate.action_back")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium">
                {detail.bpmnProcessId}
              </p>
              <Badge variant="outline">v{detail.version}</Badge>
              <InstanceStateBadge state={detail.state} />
              {detail.openIncidents > 0 ? (
                <Badge variant="destructive">
                  {detail.openIncidents} {t("workflow.operate.metric_incident")}
                </Badge>
              ) : null}
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {detail.processInstanceKey}
              {detail.businessKey ? ` · ${detail.businessKey}` : ""}
              {detail.caseId ? ` · ${detail.caseType ?? ""}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {t("workflow.operate.detail_start")}:{" "}
            {formatDateTime(detail.startTime)} ·{" "}
            {t("workflow.operate.detail_running_time")}:{" "}
            {formatDuration(detail.startTime, detail.endTime)}
          </span>
          <AutoRefreshSelect value={autoRefresh} onChange={setAutoRefresh} />
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw className="mr-1 size-3.5" />
            {t("workflow.operate.refresh")}
          </Button>
          {detail.state === "ACTIVE" ? (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              disabled={acting}
              onClick={() => setCancelOpen(true)}
            >
              <XCircle className="mr-1 size-3.5" />
              {t("workflow.operate.cancel_title")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-auto p-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-h-[28rem]">
          <OperateBpmnViewer
            title={detail.bpmnProcessId}
            xml={xml}
            highlightId={highlightId}
            elementStats={elementStats}
          />
        </div>

        <div className="flex min-h-[28rem] flex-col overflow-hidden rounded-lg border">
          <div className="flex border-b text-xs">
            {(
              [
                ["variables", t("workflow.operate.detail_variables"), variables.length],
                ["incidents", t("workflow.operate.detail_incidents"), incidents.length],
                ["jobs", t("workflow.operate.detail_jobs"), jobs.length],
                ["history", t("workflow.operate.detail_history"), history.length],
              ] as Array<[DetailTab, string, number]>
            ).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                className={
                  "flex-1 px-2 py-2 font-medium transition-colors " +
                  (tab === key
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
                onClick={() => setTab(key)}
              >
                {label} ({count})
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-2">
            {tab === "variables" ? (
              variables.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">
                  {t("workflow.operate.detail_empty_variables")}
                </p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1 text-left">
                        {t("workflow.operate.detail_name")}
                      </th>
                      <th className="px-2 py-1 text-left">
                        {t("workflow.operate.detail_scope")}
                      </th>
                      <th className="px-2 py-1 text-left">
                        {t("workflow.operate.detail_value")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {variables.map((variable) => (
                      <tr
                        key={`${variable.scopeKey}:${variable.name}`}
                        className="border-t align-top"
                      >
                        <td className="px-2 py-1 font-medium">
                          {variable.name}
                        </td>
                        <td className="px-2 py-1 font-mono text-[10px] text-muted-foreground">
                          {variable.scopeKey}
                        </td>
                        <td className="max-w-[14rem] px-2 py-1">
                          <code className="block truncate font-mono text-[10px]">
                            {variable.value}
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : null}

            {tab === "incidents" ? (
              incidents.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">
                  {t("workflow.operate.empty_incidents")}
                </p>
              ) : (
                <div className="space-y-2 p-1">
                  {incidents.map((incident) => (
                    <div
                      key={incident.incidentKey}
                      className="rounded-md border p-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="destructive">
                          {incident.errorType || t("workflow.operate.unknown_error")}
                        </Badge>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {incident.elementId || ""}
                        </span>
                      </div>
                      <p className="mt-1 break-words text-muted-foreground">
                        {incident.errorMessage || "—"}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(incident.createdAt)}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[11px]"
                            disabled={acting}
                            onClick={() =>
                              void handleRetryIncident(incident.incidentKey)
                            }
                          >
                            {t("workflow.operate.actions_retry")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[11px]"
                            disabled={acting}
                            onClick={() =>
                              void handleResolveIncident(incident.incidentKey)
                            }
                          >
                            {t("workflow.operate.actions_resolve")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : null}

            {tab === "jobs" ? (
              jobs.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">
                  {t("workflow.operate.empty_jobs")}
                </p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1 text-left">
                        {t("workflow.operate.detail_job_type")}
                      </th>
                      <th className="px-2 py-1 text-left">
                        {t("workflow.operate.col_status")}
                      </th>
                      <th className="px-2 py-1 text-left">
                        {t("workflow.operate.detail_job_retries")}
                      </th>
                      <th className="px-2 py-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.jobKey} className="border-t align-top">
                        <td className="px-2 py-1">
                          <div className="font-medium">{job.type}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {job.elementId || ""}
                            {job.worker ? ` · ${job.worker}` : ""}
                          </div>
                        </td>
                        <td className="px-2 py-1">{job.state}</td>
                        <td className="px-2 py-1">{job.retries}</td>
                        <td className="px-2 py-1 text-right">
                          {job.state === "FAILED" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[11px]"
                              disabled={acting}
                              onClick={() => void handleUpdateRetries(job.jobKey)}
                            >
                              {t("workflow.operate.detail_update_retries")}
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : null}
            {tab === "history" ? (
              history.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">
                  {t("workflow.operate.history_empty")}
                </p>
              ) : (
                <div className="space-y-1 p-1">
                  {history.map((event) => (
                    <div
                      key={event.position}
                      className="rounded-md border p-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px]"
                        >
                          {event.valueType}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(event.timestamp)}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {event.intent}
                        {event.elementId ? ` · ${event.elementId}` : ""}
                        {event.jobType ? ` · ${event.jobType}` : ""}
                        {event.userTaskKey ? ` · UT ${event.userTaskKey}` : ""}
                      </div>
                      {event.variableName ? (
                        <code className="mt-1 block truncate font-mono text-[10px]">
                          {event.variableName} = {event.variableValue}
                        </code>
                      ) : null}
                      {event.errorMessage ? (
                        <p className="mt-1 text-[10px] text-destructive">
                          {event.errorMessage}
                        </p>
                      ) : null}
                    </div>
                  ))}
                  {historyCursor ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={historyLoading}
                      onClick={() => void loadMoreHistory()}
                    >
                      {t("workflow.operate.load_more")}
                    </Button>
                  ) : null}
                </div>
              )
            ) : null}
          </div>
        </div>
      </div>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("workflow.operate.cancel_confirm_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("workflow.operate.cancel_confirm_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>
              {t("workflow.operate.cancel_confirm_cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={acting}
              onClick={(event) => {
                event.preventDefault()
                void handleCancel()
              }}
            >
              {t("workflow.operate.cancel_confirm_action")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
