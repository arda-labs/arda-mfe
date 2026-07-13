import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDot,
  Clock,
  FileSearch,
  Filter,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Search,
  XCircle,
  Zap,
  ZapOff,
} from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"
import { notify } from "@workspace/notifications/notify"
import { workflowApi } from "../api"
import type {
  ElementInstanceStat,
  IncidentState,
  JobDefinitionState,
  JobState,
  ProcessDefinitionOperate,
  ProcessInstanceState,
} from "../api"
import { OperateBpmnViewer } from "../components/bpmn-monitor-lazy"

// ─── Types ──────────────────────────────────────────────────────────────────────

type OperateTab = "instances" | "incidents" | "jobs" | "job-definitions" | "timeline"

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
  } catch {
    return value
  }
}

function computeRunningTime(startTime: string, endTime?: string) {
  const start = new Date(startTime).getTime()
  if (Number.isNaN(start)) return "—"
  const end = endTime ? new Date(endTime).getTime() : Date.now()
  if (Number.isNaN(end)) return "—"
  const diffMs = end - start
  if (diffMs < 0) return "—"
  const hours = Math.floor(diffMs / 3600000)
  const minutes = Math.floor((diffMs % 3600000) / 60000)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

// ─── Status Badges ──────────────────────────────────────────────────────────────

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
      {state === "ACTIVE" && <CircleDot className="size-3" />}
      {state === "COMPLETED" && <CheckCircle2 className="size-3" />}
      {state === "CANCELED" && <XCircle className="size-3" />}
      {state === "SUSPENDED" && <PauseCircle className="size-3" />}
      {state === "INCIDENT" && <AlertTriangle className="size-3" />}
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

function JobDefStateBadge({ state }: { state: string }) {
  const config: Record<string, { label: string; className: string }> = {
    ACTIVE: { label: "Hoạt động", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
    SUSPENDED: { label: "Tạm dừng", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  }
  const c = config[state] ?? { label: state, className: "bg-muted text-muted-foreground" }
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", c.className)}>{c.label}</span>
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export function OperateMonitoringPage() {
  const [definitions, setDefinitions] = useState<ProcessDefinitionOperate[]>([])
  const [instances, setInstances] = useState<ProcessInstanceState[]>([])
  const [incidents, setIncidents] = useState<IncidentState[]>([])
  const [jobs, setJobs] = useState<JobState[]>([])
  const [jobDefinitions, setJobDefinitions] = useState<JobDefinitionState[]>([])
  const [elementStats, setElementStats] = useState<ElementInstanceStat[]>([])

  const [loading, setLoading] = useState(true)
  const [selectedDefId, setSelectedDefId] = useState<string>("")
  const [selectedInstanceKey, setSelectedInstanceKey] = useState<string>("")
  const [instanceFilter, setInstanceFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [bottomTab, setBottomTab] = useState<OperateTab>("incidents")

  const hasLoadedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [bpmnXml, setBpmnXml] = useState("")
  const [bpmnLoading, setBpmnLoading] = useState(false)
  const abortRef = useRef<AbortController>(null)

  // Load BPMN XML when definition changes
  useEffect(() => {
    if (!selectedDefId) return
    const def = definitions.find((d) => d.id === selectedDefId)
    if (!def) return
    const loadXml = async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setBpmnLoading(true)
      try {
        const xml = await workflowApi.getProcessDefinitionXml(selectedDefId)
        if (!controller.signal.aborted) setBpmnXml(xml)
      } catch {
        if (!controller.signal.aborted) setBpmnXml("")
      } finally {
        if (!controller.signal.aborted) setBpmnLoading(false)
      }
    }
    void loadXml()
    return () => abortRef.current?.abort()
  }, [selectedDefId, definitions])

  const loadAll = useCallback(async () => {
    try {
      const [defRes, instanceRes, incidentRes, jobsRes, jdRes, statRes] = await Promise.all([
        workflowApi.listOperateProcessDefinitions(),
        workflowApi.listOperateProcessInstances(),
        workflowApi.listOperateIncidents(),
        workflowApi.listOperateJobs(),
        workflowApi.listOperateJobDefinitions(),
        workflowApi.listElementInstanceStats(),
      ])
      setDefinitions(defRes)
      setInstances(instanceRes)
      setIncidents(incidentRes)
      setJobs(jobsRes)
      setJobDefinitions(jdRes)
      setElementStats(statRes)
      if (!selectedDefId && defRes.length > 0) {
        setSelectedDefId(defRes[0].id)
      }
    } finally {
      hasLoadedRef.current = true
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    void loadAll()
    timerRef.current = setInterval(() => { void loadAll() }, 30000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const selectedDef = definitions.find((d) => d.id === selectedDefId) ?? definitions[0]

  // Compute element stats map for overlays
  const statsByElementId = useMemo(() => {
    const map = new Map<string, ElementInstanceStat>()
    for (const stat of elementStats) {
      map.set(stat.elementId, stat)
    }
    return map
  }, [elementStats])

  // Filtered instances
  const filteredInstances = useMemo(() => {
    let list = instances
    if (selectedDef) {
      list = list.filter((i) => i.bpmnProcessId === selectedDef.bpmnProcessId)
    }
    if (instanceFilter !== "all") {
      list = list.filter((i) => i.state === instanceFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter((i) =>
        i.businessKey?.toLowerCase().includes(q) ||
        i.processInstanceKey.toLowerCase().includes(q)
      )
    }
    return list
  }, [instances, selectedDef, instanceFilter, searchQuery])

  const selectedInstance = instances.find((i) => i.processInstanceKey === selectedInstanceKey)

  const metrics = useMemo(() => {
    const total = instances.length
    const active = instances.filter((i) => i.state === "ACTIVE").length
    const incident = instances.filter((i) => i.state === "INCIDENT").length
    const suspended = instances.filter((i) => i.state === "SUSPENDED").length
    const completed = instances.filter((i) => i.state === "COMPLETED").length
    return { total, active, incident, suspended, completed }
  }, [instances])

  async function handlePause(key: string) {
    try {
      await workflowApi.pauseProcessInstance(key)
      notify.success("Đã tạm dừng", `Process instance ${key}`)
      void loadAll()
    } catch (err) {
      notify.error("Tạm dừng thất bại", err instanceof Error ? err.message : undefined)
    }
  }

  async function handleResume(key: string) {
    try {
      await workflowApi.resumeProcessInstance(key)
      notify.success("Đã tiếp tục", `Process instance ${key}`)
      void loadAll()
    } catch (err) {
      notify.error("Tiếp tục thất bại", err instanceof Error ? err.message : undefined)
    }
  }

  async function handleCancel(key: string) {
    try {
      await workflowApi.cancelProcessInstance(key)
      notify.success("Đã hủy", `Process instance ${key}`)
      void loadAll()
    } catch (err) {
      notify.error("Hủy thất bại", err instanceof Error ? err.message : undefined)
    }
  }

  async function handleRetryIncident(incidentKey: string) {
    try {
      await workflowApi.retryIncident(incidentKey)
      notify.success("Đã retry incident")
      void loadAll()
    } catch (err) {
      notify.error("Retry thất bại", err instanceof Error ? err.message : undefined)
    }
  }

  async function handleResolveIncident(incidentKey: string) {
    try {
      await workflowApi.resolveIncident(incidentKey)
      notify.success("Đã resolve incident")
      void loadAll()
    } catch (err) {
      notify.error("Resolve thất bại", err instanceof Error ? err.message : undefined)
    }
  }

  async function handleRetryJob(jobKey: string) {
    try {
      await workflowApi.updateJobRetries(jobKey, 3)
      notify.success("Đã cập nhật retries cho job")
      void loadAll()
    } catch (err) {
      notify.error("Cập nhật retries thất bại", err instanceof Error ? err.message : undefined)
    }
  }

  async function handleSuspendJobDef(jdKey: string) {
    try {
      await workflowApi.suspendJobDefinition(jdKey)
      notify.success("Đã tạm dừng job definition")
      void loadAll()
    } catch (err) {
      notify.error("Tạm dừng thất bại", err instanceof Error ? err.message : undefined)
    }
  }

  async function handleActivateJobDef(jdKey: string) {
    try {
      await workflowApi.activateJobDefinition(jdKey)
      notify.success("Đã kích hoạt job definition")
      void loadAll()
    } catch (err) {
      notify.error("Kích hoạt thất bại", err instanceof Error ? err.message : undefined)
    }
  }

  const instanceFilterOptions = [
    { value: "all", label: `Tất cả (${metrics.total})` },
    { value: "ACTIVE", label: `Đang chạy (${metrics.active})` },
    { value: "INCIDENT", label: `Lỗi (${metrics.incident})` },
    { value: "SUSPENDED", label: `Tạm dừng (${metrics.suspended})` },
    { value: "COMPLETED", label: `Hoàn thành (${metrics.completed})` },
  ]

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* ── Top bar: metrics + definition filter ── */}
      <div className="flex flex-col gap-3 border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">Giám sát quy trình</h1>
            <Badge variant="outline" className="font-mono text-xs">{metrics.total} instance</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedDefId} onValueChange={setSelectedDefId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Chọn định nghĩa quy trình" />
              </SelectTrigger>
              <SelectContent>
                {definitions.map((def) => (
                  <SelectItem key={def.id} value={def.id}>
                    {def.name} ({def.bpmnProcessId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" variant="outline" onClick={() => void loadAll()}>
              <RefreshCw className="size-4" />
              Làm mới
            </Button>
          </div>
        </div>
        {/* Metrics strip */}
        <div className="flex gap-4 text-sm">
          <MetricCard label="Tổng số" value={String(metrics.total)} color="default" />
          <MetricCard label="Đang chạy" value={String(metrics.active)} color="sky" />
          <MetricCard label="Lỗi" value={String(metrics.incident)} color="red" highlight />
          <MetricCard label="Tạm dừng" value={String(metrics.suspended)} color="amber" />
          <MetricCard label="Hoàn thành" value={String(metrics.completed)} color="emerald" />
        </div>
      </div>

      {/* ── Main 3-panel layout ── */}
      <div className="flex min-h-0 flex-1">
        {/* ── Left panel: Instance list ── */}
        <div className="flex w-80 shrink-0 flex-col border-r">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm instance..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-1 border-b px-2 py-1.5">
            <Filter className="size-3.5 text-muted-foreground" />
            <Select value={instanceFilter} onValueChange={setInstanceFilter}>
              <SelectTrigger className="h-7 border-0 bg-transparent p-0 text-xs shadow-none focus:ring-0">
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
            {filteredInstances.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Không có instance nào.
              </div>
            ) : (
              <div className="divide-y">
                {filteredInstances.map((inst) => (
                  <button
                    key={inst.processInstanceKey}
                    type="button"
                    className={cn(
                      "flex w-full flex-col gap-1 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50",
                      inst.processInstanceKey === selectedInstanceKey && "bg-sky-50 dark:bg-sky-950/30"
                    )}
                    onClick={() => setSelectedInstanceKey(inst.processInstanceKey)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <InstanceStateBadge state={inst.state} />
                      <span className="font-mono text-xs text-muted-foreground truncate">
                        {inst.processInstanceKey.slice(-8)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-xs">
                        {inst.businessKey || `Instance ${inst.processInstanceKey.slice(0, 8)}...`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      <span>{computeRunningTime(inst.startTime, inst.endTime)}</span>
                      <span className="ml-auto">{formatDateTime(inst.startTime)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Center: BPMN diagram with element overlays ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {selectedDef ? (
            <OperateBpmnViewer
              title={`${selectedDef.name} — v${selectedDef.version}`}
              xml={bpmnXml}
              loading={bpmnLoading}
              elementStats={statsByElementId}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Chọn định nghĩa quy trình để xem sơ đồ.
            </div>
          )}
        </div>

        {/* ── Right panel: Detail ── */}
        <div className="flex w-96 shrink-0 flex-col border-l">
          {selectedInstance ? (
            <InstanceDetailPanel
              instance={selectedInstance}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
              <div className="text-center">
                <FileSearch className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                <p>Chọn một process instance</p>
                <p className="text-xs">bên trái để xem chi tiết</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom dock: Incidents / Jobs / Definitions / Timeline ── */}
      <BottomDock
        activeTab={bottomTab}
        onTabChange={setBottomTab}
        incidents={incidents}
        jobs={jobs}
        jobDefinitions={jobDefinitions}
        selectedDef={selectedDef}
        onRetryIncident={handleRetryIncident}
        onResolveIncident={handleResolveIncident}
        onRetryJob={handleRetryJob}
        onSuspendJobDef={handleSuspendJobDef}
        onActivateJobDef={handleActivateJobDef}
      />
    </section>
  )
}

// ─── Metric Card ────────────────────────────────────────────────────────────────

function MetricCard({ label, value, color, highlight }: { label: string; value: string; color: string; highlight?: boolean }) {
  const colors: Record<string, string> = {
    default: "text-foreground",
    sky: "text-sky-600 dark:text-sky-400",
    red: "text-red-600 dark:text-red-400",
    amber: "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
  }
  return (
    <div className={cn("flex items-center gap-2 rounded-md border bg-card px-3 py-1.5", highlight && "ring-1 ring-red-300 dark:ring-red-800")}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-base font-bold tabular-nums", colors[color] ?? colors.default)}>{value}</span>
    </div>
  )
}

// ─── Instance Detail Panel ──────────────────────────────────────────────────────

function InstanceDetailPanel({
  instance,
  onPause,
  onResume,
  onCancel,
}: {
  instance: ProcessInstanceState
  onPause: (key: string) => void
  onResume: (key: string) => void
  onCancel: (key: string) => void
}) {
  const canPause = instance.state === "ACTIVE" || instance.state === "INCIDENT"
  const canResume = instance.state === "SUSPENDED"
  const canCancel = instance.state !== "CANCELED" && instance.state !== "COMPLETED"

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Chi tiết instance</h2>
          <div className="flex gap-1">
            {canPause && (
              <Button type="button" size="icon" variant="ghost" className="size-7" title="Tạm dừng" onClick={() => onPause(instance.processInstanceKey)}>
                <PauseCircle className="size-4 text-amber-600" />
              </Button>
            )}
            {canResume && (
              <Button type="button" size="icon" variant="ghost" className="size-7" title="Tiếp tục" onClick={() => onResume(instance.processInstanceKey)}>
                <PlayCircle className="size-4 text-emerald-600" />
              </Button>
            )}
            {canCancel && (
              <Button type="button" size="icon" variant="ghost" className="size-7" title="Hủy instance" onClick={() => onCancel(instance.processInstanceKey)}>
                <Ban className="size-4 text-red-600" />
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <DetailField label="Trạng thái" value={<InstanceStateBadge state={instance.state} />} />
          <DetailField label="Process key" value={<span className="font-mono text-xs">{instance.processInstanceKey}</span>} />
          <DetailField label="Business key" value={instance.businessKey || "—"} />
          <DetailField label="BPMN process" value={instance.bpmnProcessId} />
          <DetailField label="Version" value={`v${instance.version}`} />
          <DetailField label="Element" value={instance.elementId || "—"} />
          <DetailField label="Bắt đầu" value={formatDateTime(instance.startTime)} />
          <DetailField label="Thời gian chạy" value={computeRunningTime(instance.startTime, instance.endTime)} />
          {instance.endTime && <DetailField label="Kết thúc" value={formatDateTime(instance.endTime)} />}
        </div>

        {instance.variables && Object.keys(instance.variables).length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Variables</h3>
            <div className="rounded-md border bg-muted/30 p-2">
              <pre className="overflow-x-auto text-xs font-mono">{JSON.stringify(instance.variables, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  )
}

// ─── Bottom Dock ────────────────────────────────────────────────────────────────

function BottomDock({
  activeTab,
  onTabChange,
  incidents,
  jobs,
  jobDefinitions,
  selectedDef,
  onRetryIncident,
  onResolveIncident,
  onRetryJob,
  onSuspendJobDef,
  onActivateJobDef,
}: {
  activeTab: OperateTab
  onTabChange: (tab: OperateTab) => void
  incidents: IncidentState[]
  jobs: JobState[]
  jobDefinitions: JobDefinitionState[]
  selectedDef?: ProcessDefinitionOperate
  onRetryIncident: (key: string) => void
  onResolveIncident: (key: string) => void
  onRetryJob: (key: string) => void
  onSuspendJobDef: (key: string) => void
  onActivateJobDef: (key: string) => void
}) {
  const filteredIncidents = selectedDef
    ? incidents.filter((i) => i.bpmnProcessId === selectedDef.bpmnProcessId)
    : incidents
  const filteredJobs = selectedDef
    ? jobs.filter((j) => j.bpmnProcessId === selectedDef.bpmnProcessId)
    : jobs
  const filteredJd = selectedDef
    ? jobDefinitions.filter((j) => j.bpmnProcessId === selectedDef.bpmnProcessId)
    : jobDefinitions
  const activeIncidents = filteredIncidents.filter((i) => i.state !== "RESOLVED")
  const failedJobs = filteredJobs.filter((j) => j.state === "FAILED" || j.state === "ERROR_THROWN")

  return (
    <div className="flex h-56 shrink-0 flex-col border-t">
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as OperateTab)}>
        <div className="flex items-center justify-between border-b bg-muted/20 px-3 py-1.5">
          <TabsList className="h-8">
            <TabsTrigger value="incidents" className="relative h-7 text-xs px-3">
              Incidents
              {activeIncidents.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white leading-tight">
                  {activeIncidents.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="jobs" className="relative h-7 text-xs px-3">
              Jobs
              {failedJobs.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white leading-tight">
                  {failedJobs.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="job-definitions" className="h-7 text-xs px-3">
              Job definitions
            </TabsTrigger>
            <TabsTrigger value="timeline" className="h-7 text-xs px-3">
              Timeline
            </TabsTrigger>
          </TabsList>
          <span className="text-xs text-muted-foreground">
            {selectedDef ? selectedDef.bpmnProcessId : "Tất cả"}
          </span>
        </div>
        <TabsContent value="incidents" className="m-0 flex-1 overflow-y-auto">
          <IncidentsTable items={filteredIncidents} onRetry={onRetryIncident} onResolve={onResolveIncident} />
        </TabsContent>
        <TabsContent value="jobs" className="m-0 flex-1 overflow-y-auto">
          <JobsTable items={filteredJobs} onRetry={onRetryJob} />
        </TabsContent>
        <TabsContent value="job-definitions" className="m-0 flex-1 overflow-y-auto">
          <JobDefinitionsTable items={filteredJd} onSuspend={onSuspendJobDef} onActivate={onActivateJobDef} />
        </TabsContent>
        <TabsContent value="timeline" className="m-0 flex-1 overflow-y-auto">
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Timeline tính năng đang phát triển.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Incidents Table ────────────────────────────────────────────────────────────

function IncidentsTable({
  items,
  onRetry,
  onResolve,
}: {
  items: IncidentState[]
  onRetry: (key: string) => void
  onResolve: (key: string) => void
}) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Không có incident nào.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader className="bg-muted/30 sticky top-0">
        <TableRow>
          <TableHead className="text-xs w-24">Trạng thái</TableHead>
          <TableHead className="text-xs">Element</TableHead>
          <TableHead className="text-xs">Loại lỗi</TableHead>
          <TableHead className="text-xs max-w-md">Error message</TableHead>
          <TableHead className="text-xs">Job key</TableHead>
          <TableHead className="text-xs">Thời gian</TableHead>
          <TableHead className="text-xs w-28" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((inc) => (
          <TableRow key={inc.incidentKey} className={inc.state !== "RESOLVED" ? "bg-red-50/30 dark:bg-red-950/10" : ""}>
            <TableCell><IncidentStateBadge state={inc.state} /></TableCell>
            <TableCell className="font-mono text-xs">{inc.elementId}</TableCell>
            <TableCell className="font-mono text-xs">{inc.errorType}</TableCell>
            <TableCell className="max-w-md truncate text-xs text-destructive" title={inc.errorMessage}>
              {inc.errorMessage}
            </TableCell>
            <TableCell className="font-mono text-xs">{inc.jobKey || "—"}</TableCell>
            <TableCell className="text-xs whitespace-nowrap">{formatDateTime(inc.createdAt)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  disabled={inc.state === "RESOLVED"}
                  onClick={() => onRetry(inc.incidentKey)}
                >
                  <RotateCcw className="size-3.5 mr-1" />
                  Retry
                </Button>
                {inc.state !== "RESOLVED" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => onResolve(inc.incidentKey)}
                  >
                    <CheckCircle2 className="size-3.5 mr-1" />
                    Resolve
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// ─── Jobs Table ─────────────────────────────────────────────────────────────────

function JobsTable({ items, onRetry }: { items: JobState[]; onRetry: (key: string) => void }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Không có job nào.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader className="bg-muted/30 sticky top-0">
        <TableRow>
          <TableHead className="text-xs w-24">Trạng thái</TableHead>
          <TableHead className="text-xs">Type</TableHead>
          <TableHead className="text-xs">Element</TableHead>
          <TableHead className="text-xs">Job key</TableHead>
          <TableHead className="text-xs">Retries</TableHead>
          <TableHead className="text-xs">Worker</TableHead>
          <TableHead className="text-xs">Thời gian</TableHead>
          <TableHead className="text-xs w-24" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((job) => (
          <TableRow key={job.jobKey} className={job.state === "FAILED" || job.state === "ERROR_THROWN" ? "bg-red-50/30 dark:bg-red-950/10" : ""}>
            <TableCell><JobStateBadge state={job.state} /></TableCell>
            <TableCell className="font-mono text-xs max-w-40 truncate" title={job.type}>{job.type}</TableCell>
            <TableCell className="font-mono text-xs">{job.elementId}</TableCell>
            <TableCell className="font-mono text-xs">{job.jobKey.slice(-12)}</TableCell>
            <TableCell className="text-xs">
              <span className={job.retries === 0 ? "text-destructive font-semibold" : ""}>{job.retries}/{job.maxRetries}</span>
            </TableCell>
            <TableCell className="text-xs">{job.worker || "—"}</TableCell>
            <TableCell className="text-xs whitespace-nowrap">{formatDateTime(job.createdAt)}</TableCell>
            <TableCell className="text-right">
              {(job.state === "FAILED" || job.state === "ERROR_THROWN") && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => onRetry(job.jobKey)}
                >
                  <RotateCcw className="size-3.5 mr-1" />
                  Retry
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// ─── Job Definitions Table ──────────────────────────────────────────────────────

function JobDefinitionsTable({
  items,
  onSuspend,
  onActivate,
}: {
  items: JobDefinitionState[]
  onSuspend: (key: string) => void
  onActivate: (key: string) => void
}) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Không có job definition nào.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader className="bg-muted/30 sticky top-0">
        <TableRow>
          <TableHead className="text-xs w-28">Trạng thái</TableHead>
          <TableHead className="text-xs">Type</TableHead>
          <TableHead className="text-xs">Job def key</TableHead>
          <TableHead className="text-xs">Worker</TableHead>
          <TableHead className="text-xs">Retries</TableHead>
          <TableHead className="text-xs">Ngày tạo</TableHead>
          <TableHead className="text-xs w-28" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((jd) => (
          <TableRow key={jd.jobDefinitionKey}>
            <TableCell><JobDefStateBadge state={jd.state} /></TableCell>
            <TableCell className="font-mono text-xs max-w-48 truncate" title={jd.type}>{jd.type}</TableCell>
            <TableCell className="font-mono text-xs">{jd.jobDefinitionKey}</TableCell>
            <TableCell className="text-xs">{jd.worker || "—"}</TableCell>
            <TableCell className="text-xs">{jd.retries}</TableCell>
            <TableCell className="text-xs whitespace-nowrap">{formatDateTime(jd.createdAt)}</TableCell>
            <TableCell className="text-right">
              {jd.state === "ACTIVE" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => onSuspend(jd.jobDefinitionKey)}
                >
                  <ZapOff className="size-3.5 mr-1" />
                  Suspend
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => onActivate(jd.jobDefinitionKey)}
                >
                  <Zap className="size-3.5 mr-1" />
                  Activate
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
