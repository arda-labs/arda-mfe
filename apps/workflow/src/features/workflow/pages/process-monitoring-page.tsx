import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  FileUp,
  Eye,
  Download,
  Rocket,
  Trash2,
  RefreshCw,
  MoreHorizontal,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
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
import { Badge } from "@workspace/ui/components/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { useDataTable } from "@workspace/list-page/use-data-table"
import type { ColumnDef, Row } from "@tanstack/react-table"
import { notify } from "@workspace/ui/feedback/notify"
import { useI18n } from "@workspace/i18n"
import type {
  ElementInstanceStat,
  IncidentState,
  JobState,
  WorkflowCase,
  WorkflowCaseType,
  WorkflowProcessDefinition,
} from "../api"
import { workflowApi } from "../api"
import { BpmnDefinitionViewerDialog } from "../components/bpmn-monitor-lazy"
import { ProcessInstanceOperate } from "../components/process-instance-operate"
import { ProcessDefinitionDialog } from "../shared/admin-ui"
import { InstancesTab } from "./monitoring/instances-tab"
import { IncidentsTab } from "./monitoring/incidents-tab"
import { JobsTab } from "./monitoring/jobs-tab"
import { InstanceDetail } from "./monitoring/instance-detail"

function useXml(id: string | undefined) {
  const [xml, setXml] = useState("")
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController>(null)
  const load = useCallback(async () => {
    if (!id) {
      setXml("")
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const result = await workflowApi.getProcessDefinitionXml(id)
      if (!controller.signal.aborted) setXml(result)
    } catch {
      if (!controller.signal.aborted) setXml("")
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [id])
  useEffect(() => {
    void load()
    return () => abortRef.current?.abort()
  }, [load])
  return { data: xml, isLoading: loading }
}

type PageMode = "list" | "monitor"
type HubTab = "definitions" | "instances" | "incidents" | "jobs"

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "ACTIVE" || status === "COMPLETED" ? "secondary" : "outline"
  return <Badge variant={variant}>{status}</Badge>
}

async function downloadDefinition(item: WorkflowProcessDefinition) {
  const xml =
    item.xmlContent || (await workflowApi.getProcessDefinitionXml(item.id))
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = item.resourceName || `${item.bpmnProcessId}.bpmn`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function ProcessMonitoringPage() {
  const { t } = useI18n()
  const [cases, setCases] = useState<WorkflowCase[]>([])
  const [caseTypes, setCaseTypes] = useState<WorkflowCaseType[]>([])
  const [definitions, setDefinitions] = useState<WorkflowProcessDefinition[]>(
    []
  )
  const [elementStats, setElementStats] = useState<ElementInstanceStat[]>([])
  const [incidents, setIncidents] = useState<IncidentState[]>([])
  const [jobs, setJobs] = useState<JobState[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [mode, setMode] = useState<PageMode>("list")
  const [searchParams, setSearchParams] = useSearchParams()
  const hubTabParam = searchParams.get("tab")
  const hubTab: HubTab =
    hubTabParam === "instances" ||
    hubTabParam === "incidents" ||
    hubTabParam === "jobs"
      ? hubTabParam
      : "definitions"
  const instanceParam = searchParams.get("instance") ?? undefined
  const selectTab = useCallback(
    (tab: HubTab) => {
      const next = new URLSearchParams(searchParams)
      next.set("tab", tab)
      next.delete("instance")
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )
  const openInstance = useCallback(
    (key: string) => {
      const next = new URLSearchParams(searchParams)
      next.set("instance", key)
      setSearchParams(next)
    },
    [searchParams, setSearchParams]
  )
  const closeInstance = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete("instance")
    setSearchParams(next)
  }, [searchParams, setSearchParams])
  const [selectedCaseId, setSelectedCaseId] = useState<string>()
  const [importOpen, setImportOpen] = useState(false)
  const [updatingDefinition, setUpdatingDefinition] =
    useState<WorkflowProcessDefinition | null>(null)
  const [viewingDefinition, setViewingDefinition] =
    useState<WorkflowProcessDefinition | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [monitorDef, setMonitorDef] =
    useState<WorkflowProcessDefinition | null>(null)
  const [deleteTarget, setDeleteTarget] =
    useState<WorkflowProcessDefinition | null>(null)
  const [deployPending, setDeployPending] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const loadedRef = useRef(false)

  // ── Load primary data ──
  const loadPrimary = useCallback(async () => {
    setLoadError(null)
    if (hasLoaded) return
    setLoading(true)
    try {
      const [c, ct, d] = await Promise.all([
        workflowApi.listCases(),
        workflowApi.listCaseTypes(),
        workflowApi.listProcessDefinitions(),
      ])
      setCases(c)
      setCaseTypes(ct)
      setDefinitions(d)
      setHasLoaded(true)
    } catch (reason) {
      setLoadError(reason)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void loadPrimary()
  }, [loadPrimary])

  // ── Load operate data on monitor entry ──
  const loadOperateData = useCallback(async () => {
    try {
      const [es, incPage, jobsPage] = await Promise.all([
        workflowApi.listElementInstanceStats(),
        workflowApi.searchOperateIncidents({ state: "CREATED", pageSize: 100 }),
        workflowApi.searchOperateJobs({ pageSize: 100 }),
      ])
      setElementStats(es)
      setIncidents(
        incPage.items.map((row) => ({
          incidentKey: row.incidentKey,
          processInstanceKey: row.processInstanceKey,
          processDefinitionKey: "",
          bpmnProcessId: row.bpmnProcessId ?? "",
          elementId: row.elementId ?? "",
          elementInstanceKey: row.elementInstanceKey ?? "",
          jobKey: row.jobKey,
          errorType: row.errorType ?? "",
          errorMessage: row.errorMessage ?? "",
          state: row.state as IncidentState["state"],
          createdAt: row.createdAt ?? "",
        }))
      )
      setJobs(
        jobsPage.items.map((row) => ({
          jobKey: row.jobKey,
          type: row.type,
          processInstanceKey: row.processInstanceKey,
          processDefinitionKey: "",
          bpmnProcessId: row.bpmnProcessId ?? "",
          elementId: row.elementId ?? "",
          elementInstanceKey: row.elementInstanceKey ?? "",
          state: row.state as JobState["state"],
          retries: row.retries,
          maxRetries: 3,
          createdAt: row.createdAt,
          worker: row.worker,
          errorMessage: row.errorMessage,
        }))
      )
    } catch {
      /* runtime monitoring is optional; the case monitor still renders */
    }
  }, [])

  function startMonitor(def: WorkflowProcessDefinition) {
    setMonitorDef(def)
    setSelectedCaseId(undefined)
    setMode("monitor")
    if (!loadedRef.current) {
      loadedRef.current = true
      void loadOperateData()
    }
  }

  function backToList() {
    setMode("list")
    setMonitorDef(null)
    setSelectedCaseId(undefined)
  }

  function selectCase(item: WorkflowCase) {
    setSelectedCaseId(item.id)
  }

  const monitorXmlQuery = useXml(
    monitorDef?.id && !monitorDef.xmlContent ? monitorDef.id : undefined
  )
  const monitorXml = monitorDef?.xmlContent || monitorXmlQuery.data || ""

  // XML cho viewer dialog
  const viewingXmlQuery = useXml(
    viewingDefinition?.id && !viewingDefinition.xmlContent
      ? viewingDefinition.id
      : undefined
  )
  const viewingXml = viewingDefinition?.xmlContent || viewingXmlQuery.data || ""

  const viewerDialog = viewingDefinition ? (
    <BpmnDefinitionViewerDialog
      item={viewingDefinition}
      cases={cases.filter(
        (c) => c.bpmnProcessId === viewingDefinition.bpmnProcessId
      )}
      xml={viewingXml}
      loading={viewingXmlQuery.isLoading}
      open
      onOpenChange={(open) => !open && setViewingDefinition(null)}
    />
  ) : null

  const monitorCases = useMemo(
    () =>
      monitorDef
        ? cases.filter((c) => c.bpmnProcessId === monitorDef.bpmnProcessId)
        : [],
    [cases, monitorDef]
  )
  const monitorCase =
    monitorCases.find((c) => c.id === selectedCaseId) ?? monitorCases[0]

  const currentBpmnId = monitorDef?.bpmnProcessId
  const statsByElementId = useMemo(() => {
    const map = new Map<string, ElementInstanceStat>()
    const filtered = currentBpmnId
      ? elementStats.filter((s) => s.bpmnProcessId === currentBpmnId)
      : elementStats
    for (const stat of filtered) map.set(stat.elementId, stat)
    return map
  }, [elementStats, currentBpmnId])

  async function handleDeploy(id: string) {
    setDeployPending(id)
    try {
      await workflowApi.deployProcessDefinition(id)
      notify.success(t("workflow.process_monitoring.deploy_success"))
    } catch (err) {
      notify.error(
        t("workflow.process_monitoring.deploy_failed"),
        err instanceof Error ? err.message : undefined
      )
    } finally {
      setDeployPending(null)
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return
    setSaving(deleteTarget.id)
    workflowApi
      .deleteProcessDefinition(deleteTarget.id)
      .then(() =>
        setDefinitions((prev) => prev.filter((d) => d.id !== deleteTarget.id))
      )
      .catch(() => {})
      .finally(() => {
        setSaving(null)
        setDeleteTarget(null)
      })
  }

  const filteredDefinitions = useMemo(() => {
    let list = definitions
    if (statusFilter !== "all")
      list = list.filter((d) => d.status === statusFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.bpmnProcessId.toLowerCase().includes(q) ||
          d.processCode.toLowerCase().includes(q)
      )
    }
    return list
  }, [definitions, statusFilter, searchQuery])

  const columns = useMemo<ColumnDef<WorkflowProcessDefinition>[]>(
    () => [
      {
        id: "name",
        header: t("workflow.process_monitoring.col_process_code"),
        cell: ({ row }) => (
          <div>
            <button
              type="button"
              className="text-left font-medium hover:underline"
              onClick={() => startMonitor(row.original)}
            >
              {row.original.name}
            </button>
            <p className="font-mono text-xs text-muted-foreground">
              {row.original.processCode}
            </p>
          </div>
        ),
      },
      {
        id: "bpmnProcessId",
        header: "BPMN process",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.bpmnProcessId}
          </span>
        ),
      },
      {
        id: "version",
        header: "Version",
        cell: ({ row }) => <span>v{row.original.version}</span>,
      },
      {
        id: "status",
        header: t("workflow.process_monitoring.col_status"),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const item = row.original
          const pending = deployPending != null || saving != null
          return (
            <div className="flex justify-end gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                title={t("workflow.process_monitoring.edit_bpmn_title")}
                onClick={() => setUpdatingDefinition(item)}
              >
                <FileUp className="size-3.5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setViewingDefinition(item)}>
                    <Eye className="mr-2 size-3.5" />
                    {t("workflow.process_monitoring.menu_view_bpmn")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadDefinition(item)}>
                    <Download className="mr-2 size-3.5" />
                    {t("workflow.process_monitoring.menu_download_xml")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={pending}
                    onClick={() => void handleDeploy(item.id)}
                  >
                    <Rocket className="mr-2 size-3.5" />
                    {t("workflow.process_monitoring.menu_deploy")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    disabled={pending}
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 className="mr-2 size-3.5" />
                    {t("workflow.process_monitoring.menu_delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [deployPending, saving, t]
  )

  const { table } = useDataTable({
    columns,
    data: filteredDefinitions,
    pageCount: 1,
    showRowIndex: false,
  })

  // ─── Monitor mode ───
  if (mode === "monitor" && monitorDef) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between border-b bg-background px-4 py-2">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={backToList}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <p className="text-sm font-medium">{monitorDef.name}</p>
              <p className="text-xs text-muted-foreground">
                {monitorDef.bpmnProcessId} · v{monitorDef.version} ·{" "}
                {monitorDef.processCode}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setViewingDefinition(monitorDef)}
            >
              <FileUp className="size-4" />
              {t("workflow.process_monitoring.monitor_edit_bpmn")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void loadPrimary()}
            >
              <RefreshCw className="size-4" />
              {t("workflow.process_monitoring.monitor_refresh")}
            </Button>
          </div>
        </div>
        <ProcessInstanceOperate
          cases={monitorCases}
          caseTypes={caseTypes}
          selected={monitorCase}
          bpmnXml={monitorXml}
          bpmnLoading={monitorXmlQuery.isLoading}
          onSelect={selectCase}
          elementStats={statsByElementId}
          incidents={incidents}
          jobs={jobs}
        />
        {viewerDialog}
      </div>
    )
  }

  // ─── List mode (default) ───
  const hubTabs: Array<[HubTab, string]> = [
    ["definitions", t("workflow.operate.tab_definitions")],
    ["instances", t("workflow.operate.tab_instances")],
    ["incidents", t("workflow.operate.tab_incidents")],
    ["jobs", t("workflow.operate.tab_jobs")],
  ]

  const tabBar = (
    <div className="flex items-center gap-1 border-b bg-background px-4 py-1.5">
      {hubTabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          className={
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
            (hubTab === key
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground")
          }
          onClick={() => selectTab(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )

  if (instanceParam) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {tabBar}
        <InstanceDetail instanceKey={instanceParam} onBack={closeInstance} />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {tabBar}
      <div className="flex min-h-0 flex-1 flex-col">
        {hubTab === "definitions" ? (
          <ListPageShell
        title={t("workflow.process_monitoring.title")}
        totalRows={definitions.length}
        meta={<Badge variant="outline">{t("workflow.process_monitoring.definitions_count", { count: definitions.length })}</Badge>}
        actions={
          <Button type="button" size="sm" onClick={() => setImportOpen(true)}>
            <FileUp className="mr-1 size-4" />
            Import BPMN
          </Button>
        }
        criticalPending={loading && !hasLoaded}
        criticalError={loadError}
        onRetry={loadPrimary}
        fetching={false}
        table={table}
        toolbar={
          <div className="flex items-center gap-2">
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t("workflow.process_monitoring.filter_all", { count: definitions.length })}</option>
              <option value="ACTIVE">
                {t("workflow.process_monitoring.filter_active", {
                  count: definitions.filter((d) => d.status === "ACTIVE").length,
                })}
              </option>
              <option value="DRAFT">
                {t("workflow.process_monitoring.filter_draft", {
                  count: definitions.filter((d) => d.status === "DRAFT").length,
                })}
              </option>
              <option value="INACTIVE">
                {t("workflow.process_monitoring.filter_inactive", {
                  count: definitions.filter((d) => d.status === "INACTIVE").length,
                })}
              </option>
            </select>
            <input
              className="h-8 w-40 rounded-md border border-input bg-background px-2 text-xs placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none"
              placeholder={t("workflow.process_monitoring.search_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() => void loadPrimary()}
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        }
        onRowDoubleClick={(row: Row<WorkflowProcessDefinition>) =>
          setViewingDefinition(row.original)
        }
        dialogs={
          <>
            {viewerDialog}
            <ProcessDefinitionDialog
              open={importOpen}
              onOpenChange={setImportOpen}
              onSaved={loadPrimary}
            />
            {updatingDefinition ? (
              <ProcessDefinitionDialog
                item={updatingDefinition}
                open
                onOpenChange={(open) => !open && setUpdatingDefinition(null)}
                onSaved={loadPrimary}
              />
            ) : null}
            <AlertDialog
              open={Boolean(deleteTarget)}
              onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("workflow.process_monitoring.delete_confirm_title")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("workflow.process_monitoring.delete_confirm_description", {
                      name: deleteTarget?.name ?? "",
                    })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={saving != null}>
                    {t("workflow.process_monitoring.delete_cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={saving != null}
                    onClick={confirmDelete}
                  >
                    {t("workflow.process_monitoring.delete_action")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        }
      />
        ) : hubTab === "instances" ? (
          <InstancesTab onOpenInstance={openInstance} />
        ) : hubTab === "incidents" ? (
          <IncidentsTab onOpenInstance={openInstance} />
        ) : (
          <JobsTab onOpenInstance={openInstance} />
        )}
      </div>
    </div>
  )
}
