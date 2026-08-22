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
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
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
  const config: Record<string, { label: string; className: string }> = {
    ACTIVE: { label: "Đang chạy", className: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300" },
    COMPLETED: { label: "Hoàn thành", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
    CANCELED: { label: "Đã hủy", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
    SUSPENDED: { label: "Tạm dừng", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
    INCIDENT: { label: "Lỗi", className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  }
  const c = config[state] ?? { label: state, className: "bg-muted text-muted-foreground" }
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", c.className)}>
      {c.label}
    </span>
  )
}

function IncidentStateBadge({ state }: { state: string }) {
  const config: Record<string, { label: string; className: string }> = {
    CREATED: { label: "Mới", className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
    RESOLVED: { label: "Đã xử lý", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
    PENDING: { label: "Đang chờ", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  }
  const c = config[state] ?? { label: state, className: "bg-muted text-muted-foreground" }
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", c.className)}>{c.label}</span>
}

function JobStateBadge({ state }: { state: string }) {
  const config: Record<string, { label: string; className: string }> = {
    ACTIVATABLE: { label: "Sẵn sàng", className: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300" },
    ACTIVATED: { label: "Đang chạy", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
    FAILED: { label: "Thất bại", className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
    ERROR_THROWN: { label: "Lỗi", className: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" },
    SUSPENDED: { label: "Tạm dừng", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  }
  const c = config[state] ?? { label: state, className: "bg-muted text-muted-foreground" }
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", c.className)}>{c.label}</span>
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
  const [searchQuery, setSearchQuery] = useState("")
  const [instanceFilter, setInstanceFilter] = useState("all")
  const [retryJobPending, setRetryJobPending] = useState<string | null>(null)
  const [actionPending, setActionPending] = useState<string | null>(null)
  const runtimeQuery = useProcessInstanceRuntime(selected?.processInstanceKey)
  const runtime: import("../api").ProcessInstanceRuntime | undefined = runtimeQuery.data ?? undefined
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
      list = list.filter((item) =>
        item.caseCode.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        String(item.processInstanceKey ?? "").toLowerCase().includes(q)
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
  const activeIncidents = filteredIncidents.filter((i) => i.state !== "RESOLVED")
  const failedJobs = filteredJobs.filter((j) => j.state === "FAILED" || j.state === "ERROR_THROWN")

  const instanceFilterOptions = [
    { value: "all", label: `Tất cả (${cases.length})` },
    { value: "ACTIVE", label: `Đang chạy (${cases.filter((c) => c.status === "ACTIVE" || c.status === "IN_REVIEW" || c.status === "SUBMITTED").length})` },
    { value: "INCIDENT", label: `Lỗi (${cases.filter((c) => c.status === "FAILED" || c.status === "INCIDENT").length})` },
    { value: "SUSPENDED", label: `Tạm dừng (${cases.filter((c) => c.status === "SUSPENDED").length})` },
    { value: "COMPLETED", label: `Hoàn thành (${cases.filter((c) => c.status === "COMPLETED").length})` },
  ]

  async function handleRetryJob(jobKey: string) {
    setRetryJobPending(jobKey)
    try {
      await workflowApi.retryWorkflowJob(jobKey)
      notify.success("Đã retry job")
      await runtimeQuery.refetch()
    } catch (error) {
      notify.error("Retry thất bại", error instanceof Error ? error.message : "Lỗi không xác định")
    } finally {
      setRetryJobPending(null)
    }
  }

  async function handleRetryServiceJobs() {
    if (!selected?.processInstanceKey) return
    setActionPending("retryService")
    try {
      const result = await workflowApi.retryProcessServiceJobs(String(selected.processInstanceKey))
      if (result.status === "noop") {
        notify.info("Không có incident service job", result.message)
      } else {
        notify.success("Đã retry service jobs")
      }
      await runtimeQuery.refetch()
    } catch (error) {
      notify.error("Retry thất bại", error instanceof Error ? error.message : "Lỗi không xác định")
    } finally {
      setActionPending(null)
    }
  }

  async function handlePause() {
    if (!selected?.processInstanceKey) return
    setActionPending("pause")
    try {
      await workflowApi.pauseProcessInstance(String(selected.processInstanceKey))
      notify.success("Đã tạm dừng process instance")
    } catch (error) {
      notify.error("Tạm dừng thất bại", error instanceof Error ? error.message : undefined)
    } finally {
      setActionPending(null)
    }
  }

  async function handleResume() {
    if (!selected?.processInstanceKey) return
    setActionPending("resume")
    try {
      await workflowApi.resumeProcessInstance(String(selected.processInstanceKey))
      notify.success("Đã tiếp tục process instance")
    } catch (error) {
      notify.error("Tiếp tục thất bại", error instanceof Error ? error.message : undefined)
    } finally {
      setActionPending(null)
    }
  }

  async function handleCancel() {
    if (!selected?.processInstanceKey) return
    setActionPending("cancel")
    try {
      await workflowApi.cancelProcessInstance(String(selected.processInstanceKey))
      notify.success("Đã hủy process instance")
    } catch (error) {
      notify.error("Hủy thất bại", error instanceof Error ? error.message : undefined)
    } finally {
      setActionPending(null)
    }
  }

  async function handleRetryIncident(incidentKey: string) {
    try {
      await workflowApi.retryIncident(incidentKey)
      notify.success("Đã retry incident")
    } catch (err) {
      notify.error("Retry thất bại", err instanceof Error ? err.message : undefined)
    }
  }

  async function handleResolveIncident(incidentKey: string) {
    try {
      await workflowApi.resolveIncident(incidentKey)
      notify.success("Đã resolve incident")
    } catch (err) {
      notify.error("Resolve thất bại", err instanceof Error ? err.message : undefined)
    }
  }

  async function handleRetryJobOperate(jobKey: string) {
    try {
      await workflowApi.updateJobRetries(jobKey, 3)
      notify.success("Đã cập nhật retries cho job")
    } catch (err) {
      notify.error("Cập nhật retries thất bại", err instanceof Error ? err.message : undefined)
    }
  }

  const canPause = selected?.status === "ACTIVE" || selected?.status === "IN_REVIEW" || selected?.status === "SUBMITTED" || selected?.status === "INCIDENT" || selected?.status === "FAILED"
  const canResume = selected?.status === "SUSPENDED"
  const canCancel = selected && selected.status !== "CANCELED" && selected.status !== "COMPLETED"

  return (
    <div className="flex min-h-[40rem] flex-col gap-0 overflow-hidden rounded-lg border bg-background">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div>
          <p className="text-sm font-medium">Process instances</p>
          <p className="text-xs text-muted-foreground">
            Giám sát runtime — BPMN, jobs, incidents, retry
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
            Retry service jobs
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!selected?.processInstanceKey || runtimeQuery.isFetching}
            onClick={() => runtimeQuery.refetch()}
          >
            <RefreshCw className={cn("size-4", runtimeQuery.isFetching && "animate-spin")} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* ── Body: 3-column ── */}
      <div className="grid min-h-0 flex-1 lg:grid-cols-[17rem_minmax(0,1fr)_20rem]">
        {/* ── Left: Instance list with search/filter ── */}
        <aside className="flex flex-col overflow-hidden border-b lg:border-b-0 lg:border-r">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm instance..."
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
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredCases.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                Không có instance nào.
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
                      <span className="font-medium truncate">{item.caseCode}</span>
                      <InstanceStateBadge state={item.status} />
                    </div>
                    <span className="truncate text-muted-foreground">{item.title}</span>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="truncate">{caseTypeNames.get(item.caseType) ?? item.caseType}</span>
                      {item.processInstanceKey ? (
                        <span className="font-mono">{String(item.processInstanceKey).slice(-8)}</span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── Center: BPMN viewer ── */}
        <div className="min-h-[24rem] border-b lg:border-b-0 lg:border-r">
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
              Chọn instance để xem BPMN
            </div>
          )}
        </div>

        {/* ── Right: Sidebar ── */}
        <aside className="space-y-3 overflow-auto p-4">
          {selected ? (
            <>
              <div>
                <p className="font-mono text-xs text-muted-foreground">{selected.caseCode}</p>
                <h2 className="text-base font-semibold">{selected.title}</h2>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {canPause && (
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={actionPending != null} onClick={handlePause}>
                    <PauseCircle className="size-3.5 mr-1 text-amber-600" />
                    Tạm dừng
                  </Button>
                )}
                {canResume && (
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={actionPending != null} onClick={handleResume}>
                    <PlayCircle className="size-3.5 mr-1 text-emerald-600" />
                    Tiếp tục
                  </Button>
                )}
                {canCancel && (
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs text-destructive" disabled={actionPending != null} onClick={handleCancel}>
                    <Ban className="size-3.5 mr-1" />
                    Hủy
                  </Button>
                )}
              </div>

              {(() => {
                const domainHref = workflowDomainHref(selected)
                return domainHref ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => navigateToOperate(domainHref)}>
                    <Eye className="size-4" />
                    Mở hồ sơ CRM
                  </Button>
                ) : null
              })()}

              <div className="grid grid-cols-2 gap-2 text-sm">
                <Field label="Trạng thái" value={selected.status} />
                <Field label="Bước DB" value={selected.currentStep || "—"} />
                <Field label="Active BPMN" value={runtime?.activeElementId || "—"} />
                <Field label="Assignee" value={selected.assignedTo || "Chưa nhận"} />
                <Field label="PI key" value={selected.processInstanceKey ? String(selected.processInstanceKey) : "—"} />
                <Field label="Zeebe" value={runtime?.zeebeStatus ?? (runtimeQuery.isLoading ? "…" : "—")} />
              </div>

              {runtimeQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-4" />
                  Đang quét Zeebe…
                </div>
              ) : null}

              {runtimeQuery.error ? (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>Runtime lỗi</AlertTitle>
                  <AlertDescription>{runtimeQuery.error.message}</AlertDescription>
                </Alert>
              ) : null}

              {runtime ? (
                <Alert>
                  <AlertCircle className="size-4" />
                  <AlertTitle>Gợi ý</AlertTitle>
                  <AlertDescription className="space-y-2 text-xs">
                    <p>{runtime.hint}</p>
                    <p className="text-muted-foreground">{runtime.workerNote}</p>
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
                      Lỗi
                      {(activeIncidents.length + runtimeIncidents.length) > 0 && (
                        <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white leading-tight">
                          {activeIncidents.length + runtimeIncidents.length}
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-0">
                    {runtimeIncidents.length === 0 && filteredIncidents.length === 0 ? (
                      <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        Không có lỗi
                      </div>
                    ) : (
                      <div className="max-h-48 space-y-px overflow-y-auto">
                        {runtimeIncidents.map((inc) => (
                          <div key={`rt-${inc.jobKey}`} className="flex items-start gap-2 bg-red-50/30 px-3 py-2 text-xs dark:bg-red-950/10">
                            <IncidentStateBadge state="CREATED" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-mono text-[11px] text-destructive">{inc.errorMessage || "—"}</p>
                              <p className="text-[10px] text-muted-foreground">{inc.jobType} · {inc.elementId}</p>
                            </div>
                            <Button type="button" size="sm" variant="ghost" className="h-6 shrink-0 text-[11px]" disabled={retryJobPending != null} onClick={() => handleRetryJob(inc.jobKey)}>
                              <RotateCcw className="size-3 mr-1" />
                              Retry
                            </Button>
                          </div>
                        ))}
                        {filteredIncidents.map((inc) => (
                          <div key={`op-${inc.incidentKey}`} className={`flex items-start gap-2 px-3 py-2 text-xs ${inc.state !== "RESOLVED" ? "bg-red-50/30 dark:bg-red-950/10" : ""}`}>
                            <IncidentStateBadge state={inc.state} />
                            <div className="min-w-0 flex-1">
                              <p className={`truncate font-mono text-[11px] ${inc.state !== "RESOLVED" ? "text-destructive" : "text-muted-foreground"}`}>{inc.errorMessage || "—"}</p>
                              <p className="text-[10px] text-muted-foreground">{inc.errorType} · {inc.elementId}</p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button type="button" size="sm" variant="ghost" className="h-6 text-[11px]" disabled={inc.state === "RESOLVED"} onClick={() => handleRetryIncident(inc.incidentKey)}>
                                <RotateCcw className="size-3 mr-1" />
                                Retry
                              </Button>
                              {inc.state !== "RESOLVED" && (
                                <Button type="button" size="sm" variant="ghost" className="h-6 text-[11px] text-emerald-600" onClick={() => handleResolveIncident(inc.incidentKey)}>
                                  <CheckCircle2 className="size-3 mr-1" />
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
                      Công việc
                      {failedJobs.length > 0 && (
                        <span className="inline-flex items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white leading-tight">
                          {failedJobs.length}
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-0">
                    {pendingJobs.length === 0 && filteredJobs.length === 0 ? (
                      <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        Không có công việc nền
                      </div>
                    ) : (
                      <div className="max-h-48 space-y-px overflow-y-auto">
                        {pendingJobs.map((job) => (
                          <div key={`rt-${job.jobKey}`} className={`flex items-start gap-2 px-3 py-2 text-xs ${job.retries === 0 ? "bg-red-50/30 dark:bg-red-950/10" : ""}`}>
                            <JobStateBadge state={job.state} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-mono text-[11px]">{job.jobType}</p>
                              <p className="text-[10px] text-muted-foreground">{job.elementId} · lượt {job.retries}</p>
                            </div>
                            <Button type="button" size="sm" variant="ghost" className="h-6 shrink-0 text-[11px]" disabled={retryJobPending != null} onClick={() => handleRetryJob(job.jobKey)}>
                              <RotateCcw className="size-3 mr-1" />
                              Retry
                            </Button>
                          </div>
                        ))}
                        {filteredJobs.map((job) => (
                          <div key={`op-${job.jobKey}`} className={`flex items-start gap-2 px-3 py-2 text-xs ${job.state === "FAILED" || job.state === "ERROR_THROWN" ? "bg-red-50/30 dark:bg-red-950/10" : ""}`}>
                            <JobStateBadge state={job.state} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-mono text-[11px]">{job.type}</p>
                              <p className="text-[10px] text-muted-foreground">{job.elementId} · lượt {job.retries}/{job.maxRetries}</p>
                            </div>
                            {(job.state === "FAILED" || job.state === "ERROR_THROWN") && (
                              <Button type="button" size="sm" variant="ghost" className="h-6 shrink-0 text-[11px]" onClick={() => handleRetryJobOperate(job.jobKey)}>
                                <RotateCcw className="size-3 mr-1" />
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
                      Lịch sử
                      {timeline.length > 0 && <span className="text-muted-foreground">({timeline.length})</span>}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-0">
                    {timeline.length === 0 ? (
                      <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
                        <Clock className="size-3.5" />
                        Chưa có lịch sử
                      </div>
                    ) : (
                      <div className="max-h-48 space-y-1 overflow-y-auto p-3">
                        {timeline.map((event, idx) => (
                          <div key={event.id} className="flex gap-2 text-xs">
                            <div className="mt-1 flex shrink-0 flex-col items-center">
                              <div className={`size-2 rounded-full ${idx === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                              {idx < timeline.length - 1 && <div className="mt-1 h-full w-px bg-border" />}
                            </div>
                            <div className="min-w-0 flex-1 pb-3">
                              <p className="font-medium">{event.eventType}</p>
                              <p className="text-[10px] text-muted-foreground">{formatOperateDateTime(event.createdAt)}</p>
                              {event.note ? <p className="mt-0.5 break-all font-mono text-[10px] text-muted-foreground">{event.note}</p> : null}
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
            <p className="text-sm text-muted-foreground">Chưa chọn instance.</p>
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
      <p className="break-words font-medium">{value}</p>
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
