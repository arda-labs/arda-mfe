import { Activity, useMemo, useState } from "react"
import { FileUp, RefreshCw } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import type { WorkflowCase, WorkflowProcessDefinition } from "../api"
import {
  BpmnDefinitionViewerDialog,
  BpmnViewerPanel,
} from "../components/bpmn-monitor-lazy"
import { ProcessInstanceOperate } from "../components/process-instance-operate"
import {
  useProcessDefinitionXml,
  useProcessDefinitions,
  useWorkflowCases,
  useWorkflowCaseTypes,
} from "../queries"
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

export function ProcessMonitoringPage() {
  const casesQuery = useWorkflowCases()
  const caseTypesQuery = useWorkflowCaseTypes()
  const definitionsQuery = useProcessDefinitions()
  const cases = useMemo(() => casesQuery.data?.data ?? [], [casesQuery.data?.data])
  const caseTypes = caseTypesQuery.data?.data ?? []
  const definitions = definitionsQuery.data?.data ?? []
  const [selectedId, setSelectedId] = useState<string>()
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<string>()
  const [importOpen, setImportOpen] = useState(false)
  const [viewingDefinition, setViewingDefinition] =
    useState<WorkflowProcessDefinition | null>(null)
  const [updatingDefinition, setUpdatingDefinition] =
    useState<WorkflowProcessDefinition | null>(null)
  const selected = cases.find((item) => item.id === selectedId) ?? cases[0]
  const selectedDefinition =
    definitions.find((item) => item.id === selectedDefinitionId) ?? definitions[0]
  const selectedXmlQuery = useProcessDefinitionXml(
    selectedDefinition?.id,
    Boolean(selectedDefinition && !selectedDefinition.xmlContent)
  )
  const selectedXml = selectedDefinition?.xmlContent || selectedXmlQuery.data || ""
  const viewingXmlQuery = useProcessDefinitionXml(
    viewingDefinition?.id,
    Boolean(viewingDefinition && !viewingDefinition.xmlContent)
  )
  const viewingXml = viewingDefinition?.xmlContent || viewingXmlQuery.data || ""
  const selectedCaseDefinition =
    definitions.find((item) => item.bpmnProcessId === selected?.bpmnProcessId) ??
    selectedDefinition
  const metrics = useMemo(() => monitoringMetrics(cases), [cases])
  const loading =
    casesQuery.isLoading || caseTypesQuery.isLoading || definitionsQuery.isLoading
  const [activeTab, setActiveTab] = useState("definitions")

  function selectCase(item: WorkflowCase) {
    setSelectedId(item.id)
    const definition = definitions.find((def) => def.bpmnProcessId === item.bpmnProcessId)
    if (definition) setSelectedDefinitionId(definition.id)
  }

  return (
    <WorkflowFrame
      title="Giám sát quy trình"
      description="Quản lý BPMN XML, deploy Zeebe và theo dõi instance đang chạy theo luồng nghiệp vụ."
      source={casesQuery.data?.source ?? caseTypesQuery.data?.source ?? definitionsQuery.data?.source}
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
            onClick={() => {
              casesQuery.refetch()
              caseTypesQuery.refetch()
              definitionsQuery.refetch()
            }}
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
        <ProcessDefinitionDialog open onOpenChange={setImportOpen} />
      ) : null}
      {updatingDefinition ? (
        <ProcessDefinitionDialog
          item={updatingDefinition}
          open
          onOpenChange={(open) => !open && setUpdatingDefinition(null)}
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
