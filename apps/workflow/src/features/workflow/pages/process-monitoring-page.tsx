import { Activity, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FileUp, RefreshCw } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { notify } from "@workspace/notifications/notify"
import type { WorkflowCase, WorkflowProcessDefinition, WorkflowCaseType } from "../api"
import { workflowApi } from "../api"
import {
  BpmnDefinitionViewerDialog,
  BpmnViewerPanel,
} from "../components/bpmn-monitor-lazy"
import { ProcessInstanceOperate } from "../components/process-instance-operate"
import {
  EmptyState,
  LoadingBlock,
  MonitoringCaseList,
  MonitoringDetail,
  ProcessDefinitionDialog,
  ProcessDefinitionsTable,
  WorkflowFrame,
  monitoringMetrics,
} from "../shared/admin-ui"

function useXml(id: string | undefined) {
  const [xml, setXml] = useState("")
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController>(null)
  const load = useCallback(async () => {
    if (!id) { setXml(""); return }
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
  useEffect(() => { void load(); return () => abortRef.current?.abort() }, [load])
  return { data: xml, isLoading: loading }
}

export function ProcessMonitoringPage() {
  const [cases, setCases] = useState<WorkflowCase[]>([])
  const [caseTypes, setCaseTypes] = useState<WorkflowCaseType[]>([])
  const [definitions, setDefinitions] = useState<WorkflowProcessDefinition[]>([])
  const [source, setSource] = useState<"api" | "mock">("mock")
  const [loading, setLoading] = useState(true)
  const loadPrimary = useCallback(async () => {
    setLoading(true)
    try {
      const [c, ct, d] = await Promise.all([
        workflowApi.listCases(),
        workflowApi.listCaseTypes(),
        workflowApi.listProcessDefinitions(),
      ])
      setCases(c.data)
      setCaseTypes(ct.data)
      setDefinitions(d.data)
      setSource(c.source ?? ct.source ?? d.source)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void loadPrimary() }, [loadPrimary])

  const [selectedId, setSelectedId] = useState<string>()
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<string>()
  const [importOpen, setImportOpen] = useState(false)
  const [viewingDefinition, setViewingDefinition] =
    useState<WorkflowProcessDefinition | null>(null)
  const [updatingDefinition, setUpdatingDefinition] =
    useState<WorkflowProcessDefinition | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const selected = cases.find((item) => item.id === selectedId) ?? cases[0]
  const selectedDefinition =
    definitions.find((item) => item.id === selectedDefinitionId) ?? definitions[0]
  const selectedXmlQuery = useXml(
    selectedDefinition?.id && !selectedDefinition.xmlContent ? selectedDefinition.id : undefined
  )
  const viewingXmlQuery = useXml(
    viewingDefinition?.id && !viewingDefinition.xmlContent ? viewingDefinition.id : undefined
  )
  const selectedXml = selectedDefinition?.xmlContent || selectedXmlQuery.data || ""
  const viewingXml = viewingDefinition?.xmlContent || viewingXmlQuery.data || ""
  const selectedCaseDefinition =
    definitions.find((item) => item.bpmnProcessId === selected?.bpmnProcessId) ??
    selectedDefinition
  const metrics = useMemo(() => monitoringMetrics(cases), [cases])
  const [activeTab, setActiveTab] = useState("definitions")

  function selectCase(item: WorkflowCase) {
    setSelectedId(item.id)
    const definition = definitions.find((def) => def.bpmnProcessId === item.bpmnProcessId)
    if (definition) setSelectedDefinitionId(definition.id)
  }

  function onDeploy(id: string) {
    setSaving(id)
    return workflowApi.deployProcessDefinition(id).then(() => {
      notify.success("Đã deploy quy trình lên Zeebe")
      void loadPrimary()
    }).catch((err) => {
      notify.error("Deploy thất bại", err instanceof Error ? err.message : undefined)
    }).finally(() => setSaving(null))
  }

  function onDelete(id: string) {
    setSaving(id)
    workflowApi.deleteProcessDefinition(id).then(() => {
      void loadPrimary()
    }).catch(() => {
      setSaving(null)
    })
  }

  function onPrimarySaved() { void loadPrimary() }

  return (
    <WorkflowFrame
      title="Giám sát quy trình"
      description="Quản lý BPMN XML, deploy Zeebe và theo dõi instance đang chạy theo luồng nghiệp vụ."
      source={source}
      metrics={metrics}
      action={
        <>
          <Button type="button" size="sm" onClick={() => setImportOpen(true)}>
            <FileUp className="size-4" />
            Import BPMN
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadPrimary()}
          >
            <RefreshCw className="size-4" />
            Làm mới
          </Button>
        </>
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="definitions">Định nghĩa quy trình</TabsTrigger>
            <TabsTrigger value="instances">Instance đang chạy</TabsTrigger>
            <TabsTrigger value="diagram">BPMN monitor</TabsTrigger>
          </TabsList>
          <TabsContent value="definitions">
            <ProcessDefinitionsTable
              items={definitions}
              selectedId={selectedDefinition?.id}
              onSelect={(item) => setSelectedDefinitionId(item.id)}
              onView={(item) => {
                setSelectedDefinitionId(item.id)
                setViewingDefinition(item)
              }}
              onUpdate={setUpdatingDefinition}
              onDeploy={onDeploy}
              onDelete={onDelete}
              saving={saving != null}
            />
          </TabsContent>
          <TabsContent value="instances">
            <Activity mode={activeTab === "instances" ? "visible" : "hidden"}>
              <ProcessInstanceOperate
                cases={cases}
                caseTypes={caseTypes}
                selected={selected}
                bpmnXml={selectedCaseDefinition ? selectedXml : ""}
                bpmnLoading={selectedCaseDefinition ? selectedXmlQuery.isLoading : false}
                onSelect={selectCase}
              />
            </Activity>
          </TabsContent>
          <TabsContent value="diagram">
            <Activity mode={activeTab === "diagram" ? "visible" : "hidden"}>
              <div className="grid gap-4 xl:grid-cols-[24rem_minmax(0,1fr)]">
                <MonitoringCaseList cases={cases} selectedId={selected?.id} onSelect={selectCase} />
                <BpmnViewerPanel
                  title={selectedCaseDefinition?.name ?? selected?.bpmnProcessId ?? "BPMN monitor"}
                  xml={selectedXml}
                  highlightId={selected?.currentStep}
                  loading={selectedXmlQuery.isLoading}
                  side={
                    selected ? (
                      <MonitoringDetail item={selected} />
                    ) : (
                      <EmptyState text="Chưa chọn instance để theo dõi." />
                    )
                  }
                />
              </div>
            </Activity>
          </TabsContent>
        </Tabs>
      )}
      {importOpen ? (
        <ProcessDefinitionDialog open onOpenChange={setImportOpen} onSaved={onPrimarySaved} />
      ) : null}
      {updatingDefinition ? (
        <ProcessDefinitionDialog
          item={updatingDefinition}
          open
          onOpenChange={(open) => !open && setUpdatingDefinition(null)}
          onSaved={onPrimarySaved}
        />
      ) : null}
      {viewingDefinition ? (
        <BpmnDefinitionViewerDialog
          item={viewingDefinition}
          cases={cases.filter((caseItem) => caseItem.bpmnProcessId === viewingDefinition.bpmnProcessId)}
          xml={viewingXml}
          loading={viewingXmlQuery.isLoading}
          open
          onOpenChange={(open) => !open && setViewingDefinition(null)}
        />
      ) : null}
    </WorkflowFrame>
  )
}
