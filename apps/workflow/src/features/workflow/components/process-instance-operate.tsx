import { useMemo, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDot,
  Clock,
  Eye,
  Filter,
  ListTree,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { workflowApi } from "../api"
import type {
  ElementInstanceStat,
  IncidentState,
  JobState,
  WorkflowCase,
  WorkflowCaseType,
} from "../api"
import { useProcessInstanceRuntime } from "../shared/use-process-instance-runtime"
import { OperateBpmnViewer } from "./bpmn-monitor-lazy"

type ProcessInstanceOperateProps = {
  cases: WorkflowCase[]
  caseTypes: WorkflowCaseType[]
  selected: WorkflowCase | undefined
  bpmnXml: string
  bpmnLoading?: boolean
  onSelect: (item: WorkflowCase) => void
  elementStats: Map<string, ElementInstanceStat>
  incidents: IncidentState[]
  jobs: JobState[]
}

function InstanceStateBadge({ state }: { state: string }) {
  const { t } = useI18n()
  const config: Record<string, { label: string; className: string }> = {
    ACTIVE: {
      label: t("workflow.operate.instance_state_active"),
      className: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
    },
    COMPLETED: {
      label: t("workflow.operate.instance_state_completed"),
      className:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
    CANCELED: {
      label: t("workflow.operate.instance_state_canceled"),
      className:
        "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    },
    SUSPENDED: {
      label: t("workflow.operate.instance_state_suspended"),
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    },
    INCIDENT: {
      label: t("workflow.operate.instance_state_incident"),
      className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    },
  }
  const c = config[state] ?? {
    label: state,
    className: "bg-muted text-muted-foreground",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        c.className
      )}
    >
      {c.label}
    </span>
  )
}

function IncidentStateBadge({ state }: { state: string }) {
  const { t } = useI18n()
  const config: Record<string, { label: string; className: string }> = {
    CREATED: {
      label: t("workflow.operate.incident_state_created"),
      className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    },
    RESOLVED: {
      label: t("workflow.operate.incident_state_resolved"),
      className:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
    PENDING: {
      label: t("workflow.operate.incident_state_pending"),
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    },
  }
  const c = config[state] ?? {
    label: state,
    className: "bg-muted text-muted-foreground",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        c.className
      )}
    >
      {c.label}
    </span>
  )
}

function JobStateBadge({ state }: { state: string }) {
  const { t } = useI18n()
  const config: Record<string, { label: string; className: string }> = {
    ACTIVATABLE: {
      label: t("workflow.operate.job_state_activatable"),
      className: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
    },
    ACTIVATED: {
      label: t("workflow.operate.job_state_activated"),
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    },
    FAILED: {
      label: t("workflow.operate.job_state_failed"),
      className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    },
    ERROR_THROWN: {
      label: t("workflow.operate.job_state_error_thrown"),
      className:
        "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    },
    SUSPENDED: {
      label: t("workflow.operate.job_def_state_suspended"),
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    },
  }
  const c = config[state] ?? {
    label: state,
    className: "bg-muted text-muted-foreground",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        c.className
      )}
    >
      {c.label}
    </span>
  )
}

export function ProcessInstanceOperate({
  cases,
  caseTypes,
  selected,
  bpmnXml,
  bpmnLoading,
  onSelect,
  elementStats,
  incidents,
  jobs,
}: ProcessInstanceOperateProps) {
  const { t } = useI18n()
  const [searchQuery, setSearchQuery] = useState("")
  const [instanceFilter, setInstanceFilter] = useState("all")
  const [retryJobPending, setRetryJobPending] = useState<string | null>(null)
  const [actionPending, setActionPending] = useState<string | null>(null)
  const runtimeQuery = useProcessInstanceRuntime(selected?.processInstanceKey)
  const runtime: import("../api").ProcessInstanceRuntime | undefined =
    runtimeQuery.data ?? undefined
  const pendingJobs = runtime?.pendingJobs ?? []
  const runtimeIncidents = runtime?.incidents ?? []
  const timeline = runtime?.timeline ?? []
  const highlightId = runtime?.activeElementId || selected?.currentStep
  const caseTypeNames = useMemo(
    () => new Map(caseTypes.map((item) => [item.caseType, item.operationName])),
    [caseTypes]
  )

  // Filter cases client-side
  const filteredCases = useMemo(() => {
    let list = cases
    if (instanceFilter !== "all") {
      list = list.filter((item) => item.status === instanceFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(
        (item) =>
          item.caseCode.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          String(item.processInstanceKey ?? "")
            .toLowerCase()
            .includes(q)
      )
    }
    return list
  }, [cases, instanceFilter, searchQuery])

  // Filter operate-level data per selected instance's bpmnProcessId
  const selectedBpmnId = selected?.bpmnProcessId
  const filteredIncidents = selectedBpmnId
    ? incidents.filter((i) => i.bpmnProcessId === selectedBpmnId)
    : incidents
  const filteredJobs = selectedBpmnId
    ? jobs.filter((j) => j.bpmnProcessId === selectedBpmnId)
    : jobs
  const activeIncidents = filteredIncidents.filter(
    (i) => i.state !== "RESOLVED"
  )
  const failedJobs = filteredJobs.filter(
    (j) => j.state === "FAILED" || j.state === "ERROR_THROWN"
  )

  const instanceFilterOptions = [
    { value: "all", label: t("workflow.operate.filter_all", { count: cases.length }) },
    {
      value: "ACTIVE",
      label: t("workflow.operate.filter_running", {
        count: cases.filter((c) => c.status === "ACTIVE" || c.status === "IN_REVIEW" || c.status === "SUBMITTED").length,
      }),
    },
    {
      value: "INCIDENT",
      label: t("workflow.operate.filter_incident", {
        count: cases.filter((c) => c.status === "FAILED" || c.status === "INCIDENT").length,
      }),
    },
    {
      value: "SUSPENDED",
      label: t("workflow.operate.filter_suspended", {
        count: cases.filter((c) => c.status === "SUSPENDED").length,
      }),
    },
    {
      value: "COMPLETED",
      label: t("workflow.operate.filter_completed", {
        count: cases.filter((c) => c.status === "COMPLETED").length,
      }),
    },
  ]

  async function handleRetryJob(jobKey: string) {
    setRetryJobPending(jobKey)
    try {
      await workflowApi.retryWorkflowJob(jobKey)
      notify.success(t("workflow.operate.retry_success"))
      await runtimeQuery.refetch()
    } catch (error) {
      notify.error(
        t("workflow.operate.retry_failed"),
        error instanceof Error ? error.message : t("workflow.operate.unknown_error")
      )
    } finally {
      setRetryJobPending(null)
    }
  }

  async function handleRetryServiceJobs() {
    if (!selected?.processInstanceKey) return
    setActionPending("retryService")
    try {
      const result = await workflowApi.retryProcessServiceJobs(
        String(selected.processInstanceKey)
      )
      if (result.status === "noop") {
        notify.info(t("workflow.operate.noop_incident"), result.message)
      } else {
        notify.success(t("workflow.operate.retry_service_success"))
      }
      await runtimeQuery.refetch()
    } catch (error) {
      notify.error(
        t("workflow.operate.retry_failed"),
        error instanceof Error ? error.message : t("workflow.operate.unknown_error")
      )
    } finally {
      setActionPending(null)
    }
  }

  async function handlePause() {
    if (!selected?.processInstanceKey) return
    setActionPending("pause")
    try {
      await workflowApi.pauseProcessInstance(
        String(selected.processInstanceKey)
      )
      notify.success(t("workflow.operate.pause_instance_success"))
    } catch (error) {
      notify.error(
        t("workflow.operate.pause_failed"),
        error instanceof Error ? error.message : undefined
      )
    } finally {
      setActionPending(null)
    }
  }

  async function handleResume() {
    if (!selected?.processInstanceKey) return
    setActionPending("resume")
    try {
      await workflowApi.resumeProcessInstance(
        String(selected.processInstanceKey)
      )
      notify.success(t("workflow.operate.resume_instance_success"))
    } catch (error) {
      notify.error(
        t("workflow.operate.resume_failed"),
        error instanceof Error ? error.message : undefined
      )
    } finally {
      setActionPending(null)
    }
  }

  async function handleCancel() {
    if (!selected?.processInstanceKey) return
    setActionPending("cancel")
    try {
      await workflowApi.cancelProcessInstance(
        String(selected.processInstanceKey)
      )
      notify.success(t("workflow.operate.cancel_instance_success"))
    } catch (error) {
      notify.error(
        t("workflow.operate.cancel_failed"),
        error instanceof Error ? error.message : undefined
      )
    } finally {
      setActionPending(null)
    }
  }

  async function handleRetryIncident(incidentKey: string) {
    try {
      await workflowApi.retryIncident(incidentKey)
      notify.success(t("workflow.operate.retry_incident_success"))
    } catch (err) {
      notify.error(
        t("workflow.operate.retry_failed"),
        err instanceof Error ? err.message : undefined
      )
    }
  }

  async function handleResolveIncident(incidentKey: string) {
    try {
      await workflowApi.resolveIncident(incidentKey)
      notify.success(t("workflow.operate.resolve_incident_success"))
    } catch (err) {
      notify.error(
        t("workflow.operate.resolve_failed"),
        err instanceof Error ? err.message : undefined
      )
    }
  }

  async function handleRetryJobOperate(jobKey: string) {
    try {
      await workflowApi.updateJobRetries(jobKey, 3)
      notify.success(t("workflow.operate.retry_job_success"))
    } catch (err) {
      notify.error(
        t("workflow.operate.retry_job_failed"),
        err instanceof Error ? err.message : undefined
      )
    }
  }

  const canPause =
    selected?.status === "ACTIVE" ||
    selected?.status === "IN_REVIEW" ||
    selected?.status === "SUBMITTED" ||
    selected?.status === "INCIDENT" ||
    selected?.status === "FAILED"
  const canResume = selected?.status === "SUSPENDED"
  const canCancel =
    selected &&
    selected.status !== "CANCELED" &&
    selected.status !== "COMPLETED"

  return (
    <div className="flex min-h-[40rem] flex-col gap-0 overflow-hidden rounded-lg border bg-background">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div>
          <p className="text-sm font-medium">Process instances</p>
          <p className="text-xs text-muted-foreground">
            {t("workflow.operate.monitoring_runtime_desc")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!selected?.processInstanceKey || actionPending != null}
            onClick={handleRetryServiceJobs}
          >
            <RotateCcw className="size-4" />
            {t("workflow.operate.retry_service_jobs")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!selected?.processInstanceKey || runtimeQuery.isFetching}
            onClick={() => runtimeQuery.refetch()}
          >
            <RefreshCw
              className={cn(
                "size-4",
                runtimeQuery.isFetching && "animate-spin"
              )}
            />
            {t("workflow.operate.refresh")}
          </Button>
        </div>
      </div>

      {/* ── Body: 3-column ── */}
      <div className="grid min-h-0 flex-1 lg:grid-cols-[17rem_minmax(0,1fr)_20rem]">
        {/* ── Left: Instance list with search/filter ── */}
        <aside className="flex flex-col overflow-hidden border-b lg:border-r lg:border-b-0">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("workflow.operate.search_instance_placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center gap-1 border-b px-2 py-1">
            <Filter className="size-3 text-muted-foreground" />
            <Select value={instanceFilter} onValueChange={setInstanceFilter}>
              <SelectTrigger className="h-6 border-0 bg-transparent p-0 text-xs shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {instanceFilterOptions.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-xs"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredCases.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                {t("workflow.operate.empty_instances")}
              </div>
            ) : (
              <div className="divide-y">
                {filteredCases.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50",
                      item.id === selected?.id && "bg-sky-50 dark:bg-sky-950/30"
                    )}
                    onClick={() => onSelect(item)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">
                        {item.caseCode}
                      </span>
                      <InstanceStateBadge state={item.status} />
                    </div>
                    <span className="truncate text-muted-foreground">
                      {item.title}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="truncate">
                        {caseTypeNames.get(item.caseType) ?? item.caseType}
                      </span>
                      {item.processInstanceKey ? (
                        <span className="font-mono">
                          {String(item.processInstanceKey).slice(-8)}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── Center: BPMN viewer ── */}
        <div className="min-h-[24rem] border-b lg:border-r lg:border-b-0">
          {selected ? (
            <OperateBpmnViewer
              title={selected.title}
              xml={bpmnXml}
              highlightId={highlightId}
              loading={bpmnLoading}
              elementStats={elementStats}
              className="min-h-[24rem]"
            />
          ) : (
            <div className="flex h-full min-h-[24rem] items-center justify-center text-sm text-muted-foreground">
              {t("workflow.operate.select_bpmn_hint")}
            </div>
          )}
        </div>

        {/* ── Right: Sidebar ── */}
        <aside className="space-y-3 overflow-auto p-4">
          {selected ? (
            <>
              <div>
                <p className="font-mono text-xs text-muted-foreground">
                  {selected.caseCode}
                </p>
                <h2 className="text-base font-semibold">{selected.title}</h2>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {canPause && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={actionPending != null}
                    onClick={handlePause}
                  >
                    <PauseCircle className="mr-1 size-3.5 text-amber-600" />
                    {t("workflow.operate.action_pause")}
                  </Button>
                )}
                {canResume && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={actionPending != null}
                    onClick={handleResume}
                  >
                    <PlayCircle className="mr-1 size-3.5 text-emerald-600" />
                    {t("workflow.operate.action_resume")}
                  </Button>
                )}
                {canCancel && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-destructive"
                    disabled={actionPending != null}
                    onClick={handleCancel}
                  >
                    <Ban className="mr-1 size-3.5" />
                    {t("workflow.operate.action_cancel")}
                  </Button>
                )}
              </div>

              {(() => {
                const domainHref = workflowDomainHref(selected)
                return domainHref ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => navigateToOperate(domainHref)}
                  >
                    <Eye className="size-4" />
                    {t("workflow.operate.open_crm_case")}
                  </Button>
                ) : null
              })()}

              <div className="grid grid-cols-2 gap-2 text-sm">
                <Field label={t("workflow.operate.field_status")} value={selected.status} />
                <Field label={t("workflow.operate.field_db_step")} value={selected.currentStep || "—"} />
                <Field
                  label="Active BPMN"
                  value={runtime?.activeElementId || "—"}
                />
                <Field
                  label="Assignee"
                  value={selected.assignedTo || t("workflow.operate.assignee_unassigned")}
                />
                <Field
                  label="PI key"
                  value={
                    selected.processInstanceKey
                      ? String(selected.processInstanceKey)
                      : "—"
                  }
                />
                <Field
                  label="Zeebe"
                  value={
                    runtime?.zeebeStatus ?? (runtimeQuery.isLoading ? "…" : "—")
                  }
                />
              </div>

              {runtimeQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-4" />
                  {t("workflow.operate.scanning_zeebe")}
                </div>
              ) : null}

              {runtimeQuery.error ? (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>{t("workflow.operate.runtime_error_title")}</AlertTitle>
                  <AlertDescription>
                    {runtimeQuery.error.message}
                  </AlertDescription>
                </Alert>
              ) : null}

              {runtime ? (
                <Alert>
                  <AlertCircle className="size-4" />
                  <AlertTitle>{t("workflow.operate.hint_title")}</AlertTitle>
                  <AlertDescription className="space-y-2 text-xs">
                    <p>{runtime.hint}</p>
                    <p className="text-muted-foreground">
                      {runtime.workerNote}
                    </p>
                  </AlertDescription>
                </Alert>
              ) : null}

              {/* ── Accordion: Lỗi / Công việc / Lịch sử ── */}
              <Accordion type="multiple" className="space-y-1">
                {/* ── Incidents ── */}
                <AccordionItem value="incidents" className="rounded-lg border">
                  <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline [&[data-state=open]>div>svg]:rotate-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-3.5 text-destructive" />
                      {t("workflow.operate.accordion_incidents")}
                      {activeIncidents.length + runtimeIncidents.length > 0 && (
                        <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] leading-tight font-bold text-white">
                          {activeIncidents.length + runtimeIncidents.length}
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-0">
                    {runtimeIncidents.length === 0 &&
                    filteredIncidents.length === 0 ? (
                      <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        {t("workflow.operate.no_incidents")}
                      </div>
                    ) : (
                      <div className="max-h-48 space-y-px overflow-y-auto">
                        {runtimeIncidents.map((inc) => (
                          <div
                            key={`rt-${inc.jobKey}`}
                            className="flex items-start gap-2 bg-red-50/30 px-3 py-2 text-xs dark:bg-red-950/10"
                          >
                            <IncidentStateBadge state="CREATED" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-mono text-[11px] text-destructive">
                                {inc.errorMessage || "—"}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {inc.jobType} · {inc.elementId}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-6 shrink-0 text-[11px]"
                              disabled={retryJobPending != null}
                              onClick={() => handleRetryJob(inc.jobKey)}
                            >
                              <RotateCcw className="mr-1 size-3" />
                              Retry
                            </Button>
                          </div>
                        ))}
                        {filteredIncidents.map((inc) => (
                          <div
                            key={`op-${inc.incidentKey}`}
                            className={`flex items-start gap-2 px-3 py-2 text-xs ${inc.state !== "RESOLVED" ? "bg-red-50/30 dark:bg-red-950/10" : ""}`}
                          >
                            <IncidentStateBadge state={inc.state} />
                            <div className="min-w-0 flex-1">
                              <p
                                className={`truncate font-mono text-[11px] ${inc.state !== "RESOLVED" ? "text-destructive" : "text-muted-foreground"}`}
                              >
                                {inc.errorMessage || "—"}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {inc.errorType} · {inc.elementId}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[11px]"
                                disabled={inc.state === "RESOLVED"}
                                onClick={() =>
                                  handleRetryIncident(inc.incidentKey)
                                }
                              >
                                <RotateCcw className="mr-1 size-3" />
                                Retry
                              </Button>
                              {inc.state !== "RESOLVED" && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[11px] text-emerald-600"
                                  onClick={() =>
                                    handleResolveIncident(inc.incidentKey)
                                  }
                                >
                                  <CheckCircle2 className="mr-1 size-3" />
                                  Resolve
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* ── Jobs ── */}
                <AccordionItem value="jobs" className="rounded-lg border">
                  <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline">
                    <div className="flex items-center gap-2">
                      <CircleDot className="size-3.5 text-amber-500" />
                      {t("workflow.operate.accordion_jobs")}
                      {failedJobs.length > 0 && (
                        <span className="inline-flex items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] leading-tight font-bold text-white">
                          {failedJobs.length}
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-0">
                    {pendingJobs.length === 0 && filteredJobs.length === 0 ? (
                      <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        {t("workflow.operate.no_background_jobs")}
                      </div>
                    ) : (
                      <div className="max-h-48 space-y-px overflow-y-auto">
                        {pendingJobs.map((job) => (
                          <div
                            key={`rt-${job.jobKey}`}
                            className={`flex items-start gap-2 px-3 py-2 text-xs ${job.retries === 0 ? "bg-red-50/30 dark:bg-red-950/10" : ""}`}
                          >
                            <JobStateBadge state={job.state} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-mono text-[11px]">
                                {job.jobType}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {job.elementId} · {t("workflow.operate.retries_round", { retries: job.retries })}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-6 shrink-0 text-[11px]"
                              disabled={retryJobPending != null}
                              onClick={() => handleRetryJob(job.jobKey)}
                            >
                              <RotateCcw className="mr-1 size-3" />
                              Retry
                            </Button>
                          </div>
                        ))}
                        {filteredJobs.map((job) => (
                          <div
                            key={`op-${job.jobKey}`}
                            className={`flex items-start gap-2 px-3 py-2 text-xs ${job.state === "FAILED" || job.state === "ERROR_THROWN" ? "bg-red-50/30 dark:bg-red-950/10" : ""}`}
                          >
                            <JobStateBadge state={job.state} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-mono text-[11px]">
                                {job.type}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {job.elementId} · {t("workflow.operate.retries_round", { retries: job.retries })}/
                                {job.maxRetries}
                              </p>
                            </div>
                            {(job.state === "FAILED" ||
                              job.state === "ERROR_THROWN") && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-6 shrink-0 text-[11px]"
                                onClick={() =>
                                  handleRetryJobOperate(job.jobKey)
                                }
                              >
                                <RotateCcw className="mr-1 size-3" />
                                Retry
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* ── Timeline ── */}
                <AccordionItem value="timeline" className="rounded-lg border">
                  <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline">
                    <div className="flex items-center gap-2">
                      <ListTree className="size-3.5 text-muted-foreground" />
                      {t("workflow.operate.accordion_timeline")}
                      {timeline.length > 0 && (
                        <span className="text-muted-foreground">
                          ({timeline.length})
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-0">
                    {timeline.length === 0 ? (
                      <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
                        <Clock className="size-3.5" />
                        {t("workflow.operate.no_history")}
                      </div>
                    ) : (
                      <div className="max-h-48 space-y-1 overflow-y-auto p-3">
                        {timeline.map((event, idx) => (
                          <div key={event.id} className="flex gap-2 text-xs">
                            <div className="mt-1 flex shrink-0 flex-col items-center">
                              <div
                                className={`size-2 rounded-full ${idx === 0 ? "bg-primary" : "bg-muted-foreground/30"}`}
                              />
                              {idx < timeline.length - 1 && (
                                <div className="mt-1 h-full w-px bg-border" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1 pb-3">
                              <p className="font-medium">{event.eventType}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatOperateDateTime(event.createdAt)}
                              </p>
                              {event.note ? (
                                <p className="mt-0.5 font-mono text-[10px] break-all text-muted-foreground">
                                  {event.note}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("workflow.operate.no_instance_selected")}</p>
          )}
        </aside>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{value}</p>
    </div>
  )
}

function formatOperateDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("vi-VN")
}

function workflowDomainHref(item: WorkflowCase) {
  if (item.caseType === "CUSTOMER_REGISTRATION" && item.primaryObjectId) {
    return `/customers/registrations?customerId=${encodeURIComponent(item.primaryObjectId)}&caseId=${encodeURIComponent(item.id)}&caseCode=${encodeURIComponent(item.caseCode)}&processInstanceKey=${encodeURIComponent(String(item.processInstanceKey ?? ""))}`
  }
  return ""
}

function navigateToOperate(path: string) {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
}
