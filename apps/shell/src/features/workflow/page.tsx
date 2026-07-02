import { useMemo, useState } from "react"
import {
  AlertCircle,
  Check,
  ChevronsUpDown,
  Download,
  Edit,
  Eye,
  FileUp,
  Plus,
  Rocket,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
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
import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
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
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import { workflowApi } from "./api"
import { BpmnDefinitionViewerDialog, BpmnViewerPanel } from "./components/bpmn-monitor"
import type {
  DescriptionTemplate,
  ProcessRole,
  SlaPolicy,
  SlaTaskPolicy,
  WorkflowAssignmentRule,
  WorkflowCase,
  WorkflowCaseType,
  WorkflowDelegation,
  WorkflowProcessDefinition,
  WorkflowRoleCatalog,
  WorkflowRoleMembership,
} from "./api"
import {
  useAssignmentRules,
  useDeleteProcessDefinition,
  useDeployProcessDefinition,
  useDelegations,
  useDescriptionTemplates,
  useImportProcessDefinition,
  useProcessRoles,
  useProcessDefinitionXml,
  useProcessDefinitions,
  useRoleCatalog,
  useRoleMemberships,
  useSaveAssignmentRule,
  useSaveCaseType,
  useSaveDelegation,
  useSaveDescriptionTemplate,
  useSaveProcessRole,
  useSaveRoleCatalog,
  useSaveRoleMembership,
  useSaveSlaPolicy,
  useSlaPolicies,
  useUpdateProcessDefinition,
  useUpdateProcessConfig,
  useWorkflowCases,
  useWorkflowCaseTypes,
} from "./queries"

type WorkflowRoute =
  | "case-types"
  | "process-configs"
  | "sla-policies"
  | "description-templates"
  | "roles"
  | "monitoring"

export function WorkflowAdminPage({ pathname }: { pathname: string }) {
  const route = routeFromPath(pathname)

  if (route === "process-configs") return <ProcessConfigsPage />
  if (route === "sla-policies") return <SlaPoliciesPage />
  if (route === "description-templates") return <DescriptionTemplatesPage />
  if (route === "roles") return <ProcessRolesPage />
  if (route === "monitoring") return <ProcessMonitoringPage />
  return <CaseTypesPage />
}

function CaseTypesPage() {
  const { data, isLoading } = useWorkflowCaseTypes()
  const items = data?.data ?? []
  const [editing, setEditing] = useState<WorkflowCaseType | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const businessAreas = new Set(items.map((item) => item.businessArea)).size
  const businessAreaOptions = uniqueOptions(items.map((item) => item.businessArea), defaultBusinessAreaOptions)
  const roleOptions = roleOptionsFromCaseTypes(items)

  return (
    <WorkflowFrame
      title="Danh mục loại nghiệp vụ"
      description="Quản lý mã nghiệp vụ, khu vực menu, service sở hữu và trạng thái áp dụng."
      source={data?.source}
      metrics={[
        { label: "Loại nghiệp vụ", value: String(items.length), tone: "default" },
        { label: "Nhóm menu", value: String(businessAreas), tone: "success" },
        {
          label: "Bản nháp",
          value: String(items.filter((item) => item.status !== "ACTIVE").length),
          tone: "warning",
        },
      ]}
      action={<Button type="button" size="sm" onClick={() => setCreateOpen(true)}>Tạo loại nghiệp vụ</Button>}
    >
      {isLoading ? (
        <LoadingBlock />
      ) : (
        <CaseTypeTable items={items} mode="catalog" onEdit={setEditing} />
      )}
      {createOpen ? (
        <CaseTypeDialog
          open
          businessAreaOptions={businessAreaOptions}
          roleOptions={roleOptions}
          onOpenChange={setCreateOpen}
        />
      ) : null}
      {editing ? (
        <CaseTypeDialog
          item={editing}
          open
          businessAreaOptions={businessAreaOptions}
          roleOptions={roleOptions}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      ) : null}
    </WorkflowFrame>
  )
}

function ProcessConfigsPage() {
  const { data, isLoading } = useWorkflowCaseTypes()
  const slaQuery = useSlaPolicies()
  const items = data?.data ?? []
  const slaItems = slaQuery.data?.data ?? []
  const [editing, setEditing] = useState<WorkflowCaseType>()
  const enabled = items.filter((item) => item.workflowEnabled).length
  const roleOptions = roleOptionsFromCaseTypes(items)
  const slaOptions = slaItems.map((item) => ({
    value: item.id,
    label: `${item.code} - ${item.name}`,
    description: item.caseType,
  }))

  return (
    <WorkflowFrame
      title="Cấu hình quy trình"
      description="Ánh xạ từng loại nghiệp vụ tới BPMN process id, version, SLA mặc định và role xử lý."
      source={data?.source}
      metrics={[
        { label: "Loại nghiệp vụ", value: String(items.length), tone: "default" },
        { label: "Đang bật workflow", value: String(enabled), tone: "success" },
        {
          label: "Chưa áp dụng",
          value: String(items.filter((item) => item.status !== "ACTIVE").length),
          tone: "warning",
        },
      ]}
    >
      {isLoading ? (
        <LoadingBlock />
      ) : (
        <CaseTypeTable items={items} mode="process" onEdit={setEditing} />
      )}
      {editing ? (
        <ProcessConfigDialog
          item={editing}
          roleOptions={roleOptions}
          slaOptions={slaOptions}
          onOpenChange={(open) => !open && setEditing(undefined)}
        />
      ) : null}
    </WorkflowFrame>
  )
}

function SlaPoliciesPage() {
  const { data, isLoading } = useSlaPolicies()
  const caseTypesQuery = useWorkflowCaseTypes()
  const items = data?.data ?? []
  const caseTypeOptions = caseTypeOptionsFromCaseTypes(caseTypesQuery.data?.data ?? [])
  const roleOptions = uniqueOptions(items.map((item) => item.escalationRole), [])
  const [editing, setEditing] = useState<SlaPolicy | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <WorkflowFrame
      title="Cấu hình SLA"
      description="Định nghĩa thời hạn xử lý, ngưỡng cảnh báo và role escalations cho từng nghiệp vụ."
      source={data?.source}
      action={<Button type="button" size="sm" onClick={() => setCreateOpen(true)}>Tạo SLA</Button>}
    >
      {isLoading ? <LoadingBlock /> : <SlaTable items={items} onEdit={setEditing} />}
      {createOpen ? (
        <SlaPolicyDialog
          open
          caseTypeOptions={caseTypeOptions}
          roleOptions={roleOptions}
          onOpenChange={setCreateOpen}
        />
      ) : null}
      {editing ? (
        <SlaPolicyDialog
          item={editing}
          open
          caseTypeOptions={caseTypeOptions}
          roleOptions={roleOptions}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      ) : null}
    </WorkflowFrame>
  )
}

function DescriptionTemplatesPage() {
  const { data, isLoading } = useDescriptionTemplates()
  const caseTypesQuery = useWorkflowCaseTypes()
  const items = data?.data ?? []
  const caseTypeOptions = caseTypeOptionsFromCaseTypes(caseTypesQuery.data?.data ?? [])
  const [editing, setEditing] = useState<DescriptionTemplate | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <WorkflowFrame
      title="Cấu trúc diễn giải"
      description="Chuẩn hóa cách sinh tiêu đề, mô tả và dòng timeline để các danh sách dễ quét."
      source={data?.source}
      action={<Button type="button" size="sm" onClick={() => setCreateOpen(true)}>Tạo cấu trúc</Button>}
    >
      {isLoading ? (
        <LoadingBlock />
      ) : (
        <DescriptionTemplateTable items={items} onEdit={setEditing} />
      )}
      {createOpen ? (
        <DescriptionTemplateDialog
          open
          caseTypeOptions={caseTypeOptions}
          subsystemOptions={businessSubsystemOptions}
          onOpenChange={setCreateOpen}
        />
      ) : null}
      {editing ? (
        <DescriptionTemplateDialog
          item={editing}
          open
          caseTypeOptions={caseTypeOptions}
          subsystemOptions={businessSubsystemOptions}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      ) : null}
    </WorkflowFrame>
  )
}

function ProcessRolesPage() {
  const stepRolesQuery = useProcessRoles()
  const roleCatalogQuery = useRoleCatalog()
  const membershipsQuery = useRoleMemberships()
  const assignmentRulesQuery = useAssignmentRules()
  const delegationsQuery = useDelegations()
  const caseTypesQuery = useWorkflowCaseTypes()
  const items = stepRolesQuery.data?.data ?? []
  const roleCatalog = roleCatalogQuery.data?.data ?? []
  const memberships = membershipsQuery.data?.data ?? []
  const assignmentRules = assignmentRulesQuery.data?.data ?? []
  const delegations = delegationsQuery.data?.data ?? []
  const caseTypeOptions = caseTypeOptionsFromCaseTypes(caseTypesQuery.data?.data ?? [])
  const roleCodeOptions = roleCatalog.map((item) => ({ value: item.roleCode, label: `${item.roleCode} - ${item.roleName}` }))
  const iamRoleOptions = uniqueOptions(items.map((item) => item.iamRole), roleCodeOptions)
  const [activeTab, setActiveTab] = useState("catalog")
  const [editing, setEditing] = useState<ProcessRole | null>(null)
  const [editingCatalog, setEditingCatalog] = useState<WorkflowRoleCatalog | null>(null)
  const [editingMembership, setEditingMembership] = useState<WorkflowRoleMembership | null>(null)
  const [editingRule, setEditingRule] = useState<WorkflowAssignmentRule | null>(null)
  const [editingDelegation, setEditingDelegation] = useState<WorkflowDelegation | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const loading =
    stepRolesQuery.isLoading ||
    roleCatalogQuery.isLoading ||
    membershipsQuery.isLoading ||
    assignmentRulesQuery.isLoading ||
    delegationsQuery.isLoading
  const actionLabel = {
    catalog: "Tạo role",
    membership: "Thêm thành viên",
    assignment: "Tạo luật phân công",
    delegation: "Tạo ủy quyền",
    mapping: "Tạo mapping bước",
  }[activeTab] ?? "Tạo"

  return (
    <WorkflowFrame
      title="Vai trò quy trình"
      description="Quản lý role vận hành, thành viên, luật phân công, ủy quyền và mapping từng bước quy trình."
      source={stepRolesQuery.data?.source ?? roleCatalogQuery.data?.source}
      metrics={[
        { label: "Role", value: String(roleCatalog.length), tone: "default" },
        { label: "Thành viên", value: String(memberships.length), tone: "success" },
        {
          label: "Luật tách maker/checker",
          value: String(assignmentRules.filter((item) => item.requireSeparationOfDuties).length),
          tone: "warning",
        },
      ]}
      action={<Button type="button" size="sm" onClick={() => setCreateOpen(true)}>{actionLabel}</Button>}
    >
      {loading ? (
        <LoadingBlock />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="catalog">Role catalog</TabsTrigger>
            <TabsTrigger value="membership">Thành viên</TabsTrigger>
            <TabsTrigger value="assignment">Luật phân công</TabsTrigger>
            <TabsTrigger value="delegation">Ủy quyền</TabsTrigger>
            <TabsTrigger value="mapping">Mapping bước</TabsTrigger>
          </TabsList>
          <TabsContent value="catalog">
            <RoleCatalogTable items={roleCatalog} onEdit={setEditingCatalog} />
          </TabsContent>
          <TabsContent value="membership">
            <RoleMembershipTable items={memberships} onEdit={setEditingMembership} />
          </TabsContent>
          <TabsContent value="assignment">
            <AssignmentRuleTable items={assignmentRules} onEdit={setEditingRule} />
          </TabsContent>
          <TabsContent value="delegation">
            <DelegationTable items={delegations} onEdit={setEditingDelegation} />
          </TabsContent>
          <TabsContent value="mapping">
            <ProcessRoleTable items={items} onEdit={setEditing} />
          </TabsContent>
        </Tabs>
      )}
      {createOpen && activeTab === "catalog" ? (
        <RoleCatalogDialog open onOpenChange={setCreateOpen} />
      ) : null}
      {createOpen && activeTab === "membership" ? (
        <RoleMembershipDialog open roleOptions={roleCodeOptions} onOpenChange={setCreateOpen} />
      ) : null}
      {createOpen && activeTab === "assignment" ? (
        <AssignmentRuleDialog open caseTypeOptions={caseTypeOptions} roleOptions={roleCodeOptions} onOpenChange={setCreateOpen} />
      ) : null}
      {createOpen && activeTab === "delegation" ? (
        <DelegationDialog open roleOptions={roleCodeOptions} onOpenChange={setCreateOpen} />
      ) : null}
      {createOpen && activeTab === "mapping" ? (
        <ProcessRoleDialog open caseTypeOptions={caseTypeOptions} iamRoleOptions={iamRoleOptions} onOpenChange={setCreateOpen} />
      ) : null}
      {editingCatalog ? (
        <RoleCatalogDialog item={editingCatalog} open onOpenChange={(open) => !open && setEditingCatalog(null)} />
      ) : null}
      {editingMembership ? (
        <RoleMembershipDialog item={editingMembership} open roleOptions={roleCodeOptions} onOpenChange={(open) => !open && setEditingMembership(null)} />
      ) : null}
      {editingRule ? (
        <AssignmentRuleDialog item={editingRule} open caseTypeOptions={caseTypeOptions} roleOptions={roleCodeOptions} onOpenChange={(open) => !open && setEditingRule(null)} />
      ) : null}
      {editingDelegation ? (
        <DelegationDialog item={editingDelegation} open roleOptions={roleCodeOptions} onOpenChange={(open) => !open && setEditingDelegation(null)} />
      ) : null}
      {editing ? (
        <ProcessRoleDialog
          item={editing}
          open
          caseTypeOptions={caseTypeOptions}
          iamRoleOptions={iamRoleOptions}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      ) : null}
    </WorkflowFrame>
  )
}

function ProcessMonitoringPage() {
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
        <Tabs defaultValue="definitions">
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
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
              <MonitoringTable cases={cases} caseTypes={caseTypes} onSelect={selectCase} />
              {selected ? <MonitoringDetail item={selected} /> : null}
            </div>
          </TabsContent>
          <TabsContent value="diagram">
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

function WorkflowFrame({
  title,
  description,
  source,
  metrics,
  action,
  children,
}: {
  title: string
  description: string
  source?: "api" | "mock"
  metrics?: { label: string; value: string; tone: "default" | "success" | "warning" | "error" }[]
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
      </div>
      {source === "mock" ? <MockNotice /> : null}
      {metrics?.length ? <MetricStrip metrics={metrics} /> : null}
      {children}
    </div>
  )
}

function CaseTypeTable({
  items,
  mode,
  onEdit,
}: {
  items: WorkflowCaseType[]
  mode: "catalog" | "process"
  onEdit?: (item: WorkflowCaseType) => void
}) {
  if (!items.length) return <EmptyState text="Chưa có loại nghiệp vụ." />

  return (
    <DataShell>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Loại nghiệp vụ</TableHead>
            <TableHead>Menu</TableHead>
            <TableHead>Tên vận hành</TableHead>
            <TableHead>{mode === "process" ? "BPMN process" : "Service"}</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Trạng thái</TableHead>
            {onEdit ? <TableHead /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.caseType}>
              <TableCell className="font-mono text-xs">{item.caseType}</TableCell>
              <TableCell>{item.businessArea}</TableCell>
              <TableCell className="font-medium">{item.operationName}</TableCell>
              <TableCell className="text-muted-foreground">
                {mode === "process"
                  ? `${item.bpmnProcessId} / v${item.bpmnVersion}`
                  : item.ownerService}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {item.makerRole}
                <br />
                {item.checkerRole}
              </TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              {onEdit ? (
                <TableCell className="text-right">
                  <Button type="button" size="sm" variant="outline" onClick={() => onEdit(item)}>
                    <Edit className="size-4" />
                    Sửa
                  </Button>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataShell>
  )
}

function SlaTable({ items, onEdit }: { items: SlaPolicy[]; onEdit: (item: SlaPolicy) => void }) {
  if (!items.length) return <EmptyState text="Chưa có SLA policy." />
  return (
    <DataShell>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Mã SLA</TableHead>
            <TableHead>Tên SLA</TableHead>
            <TableHead>Loại nghiệp vụ</TableHead>
            <TableHead>Thời hạn</TableHead>
            <TableHead>Cảnh báo</TableHead>
            <TableHead>Tác vụ</TableHead>
            <TableHead>Hiệu lực</TableHead>
            <TableHead>Escalation</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">{item.code}</TableCell>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{item.caseType}</TableCell>
              <TableCell>{item.dueInHours} giờ</TableCell>
              <TableCell>{item.warningInHours} giờ trước hạn</TableCell>
              <TableCell>{item.taskPolicies?.length ?? 0}</TableCell>
              <TableCell>{formatDateOnly(item.effectiveFrom) || "-"}</TableCell>
              <TableCell>{item.escalationRole}</TableCell>
              <TableCell><StatusBadge status={item.status} /></TableCell>
              <TableCell className="text-right">
                <Button type="button" size="sm" variant="outline" onClick={() => onEdit(item)}>
                  <Edit className="size-4" />
                  Sửa
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataShell>
  )
}

function DescriptionTemplateTable({
  items,
  onEdit,
}: {
  items: DescriptionTemplate[]
  onEdit: (item: DescriptionTemplate) => void
}) {
  if (!items.length) return <EmptyState text="Chưa có cấu trúc diễn giải." />
  return (
    <DataShell>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Mã</TableHead>
            <TableHead>Phân hệ</TableHead>
            <TableHead>Loại nghiệp vụ</TableHead>
            <TableHead>Cấu trúc</TableHead>
            <TableHead>Xem trước</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">{item.code}</TableCell>
              <TableCell>{subsystemLabel(item.businessSubsystem)}</TableCell>
              <TableCell>{item.caseType}</TableCell>
              <TableCell className="max-w-md font-mono text-xs">{item.pattern}</TableCell>
              <TableCell className="text-muted-foreground">{item.preview}</TableCell>
              <TableCell><StatusBadge status={item.status} /></TableCell>
              <TableCell className="text-right">
                <Button type="button" size="sm" variant="outline" onClick={() => onEdit(item)}>
                  <Edit className="size-4" />
                  Sửa
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataShell>
  )
}

function ProcessRoleTable({ items, onEdit }: { items: ProcessRole[]; onEdit: (item: ProcessRole) => void }) {
  if (!items.length) return <EmptyState text="Chưa có vai trò quy trình." />
  return (
    <DataShell>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Loại nghiệp vụ</TableHead>
            <TableHead>Bước</TableHead>
            <TableHead>Vai trò nghiệp vụ</TableHead>
            <TableHead>IAM role</TableHead>
            <TableHead>Quyền thao tác</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.caseType}</TableCell>
              <TableCell className="font-mono text-xs">{item.stepCode}</TableCell>
              <TableCell className="font-medium">{item.businessRole}</TableCell>
              <TableCell>{item.iamRole}</TableCell>
              <TableCell className="text-muted-foreground">{item.actionScope}</TableCell>
              <TableCell><StatusBadge status={item.status} /></TableCell>
              <TableCell className="text-right">
                <Button type="button" size="sm" variant="outline" onClick={() => onEdit(item)}>
                  <Edit className="size-4" />
                  Sửa
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataShell>
  )
}

function RoleCatalogTable({ items, onEdit }: { items: WorkflowRoleCatalog[]; onEdit: (item: WorkflowRoleCatalog) => void }) {
  if (!items.length) return <EmptyState text="Chưa có role vận hành." />
  return (
    <DataShell>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Role code</TableHead>
            <TableHead>Tên role</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Phân hệ</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.roleCode}>
              <TableCell className="font-mono text-xs">{item.roleCode}</TableCell>
              <TableCell className="font-medium">{item.roleName}</TableCell>
              <TableCell>{item.roleType}</TableCell>
              <TableCell>{subsystemLabel(item.businessSubsystem)}</TableCell>
              <TableCell><StatusBadge status={item.status} /></TableCell>
              <TableCell className="text-right">
                <Button type="button" size="sm" variant="outline" onClick={() => onEdit(item)}>
                  <Edit className="size-4" />
                  Sửa
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataShell>
  )
}

function RoleMembershipTable({ items, onEdit }: { items: WorkflowRoleMembership[]; onEdit: (item: WorkflowRoleMembership) => void }) {
  if (!items.length) return <EmptyState text="Chưa có thành viên role." />
  return (
    <DataShell>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Role</TableHead>
            <TableHead>Principal</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Hạn mức</TableHead>
            <TableHead>Hiệu lực</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">{item.roleCode}</TableCell>
              <TableCell>{item.principalType}:{item.principalId}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {[item.orgId, item.branchId, item.productCode].filter(Boolean).join(" / ") || "Toàn hệ thống"}
              </TableCell>
              <TableCell>{formatAmountRange(item.minAmount, item.maxAmount)}</TableCell>
              <TableCell>{formatDateOnly(item.effectiveFrom)} - {formatDateOnly(item.effectiveTo) || "..."}</TableCell>
              <TableCell><StatusBadge status={item.status} /></TableCell>
              <TableCell className="text-right">
                <Button type="button" size="sm" variant="outline" onClick={() => onEdit(item)}>
                  <Edit className="size-4" />
                  Sửa
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataShell>
  )
}

function AssignmentRuleTable({ items, onEdit }: { items: WorkflowAssignmentRule[]; onEdit: (item: WorkflowAssignmentRule) => void }) {
  if (!items.length) return <EmptyState text="Chưa có luật phân công." />
  return (
    <DataShell>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Loại nghiệp vụ</TableHead>
            <TableHead>Bước</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Maker/checker</TableHead>
            <TableHead>Fallback</TableHead>
            <TableHead>Ưu tiên</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.caseType}</TableCell>
              <TableCell className="font-mono text-xs">{item.stepCode}</TableCell>
              <TableCell>{item.roleCode}</TableCell>
              <TableCell>{item.assignmentMode}</TableCell>
              <TableCell>{item.requireSeparationOfDuties ? "Bắt buộc tách" : "Không bắt buộc"}</TableCell>
              <TableCell>{item.fallbackRoleCode || "-"}</TableCell>
              <TableCell>{item.priority}</TableCell>
              <TableCell><StatusBadge status={item.status} /></TableCell>
              <TableCell className="text-right">
                <Button type="button" size="sm" variant="outline" onClick={() => onEdit(item)}>
                  <Edit className="size-4" />
                  Sửa
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataShell>
  )
}

function DelegationTable({ items, onEdit }: { items: WorkflowDelegation[]; onEdit: (item: WorkflowDelegation) => void }) {
  if (!items.length) return <EmptyState text="Chưa có ủy quyền xử lý." />
  return (
    <DataShell>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Role</TableHead>
            <TableHead>Từ người</TableHead>
            <TableHead>Sang người</TableHead>
            <TableHead>Hiệu lực</TableHead>
            <TableHead>Lý do</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.roleCode}</TableCell>
              <TableCell>{item.fromPrincipalId}</TableCell>
              <TableCell>{item.toPrincipalId}</TableCell>
              <TableCell>{formatDateOnly(item.effectiveFrom)} - {formatDateOnly(item.effectiveTo) || "..."}</TableCell>
              <TableCell className="text-muted-foreground">{item.reason || "-"}</TableCell>
              <TableCell><StatusBadge status={item.status} /></TableCell>
              <TableCell className="text-right">
                <Button type="button" size="sm" variant="outline" onClick={() => onEdit(item)}>
                  <Edit className="size-4" />
                  Sửa
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataShell>
  )
}

function ProcessDefinitionsTable({
  items,
  selectedId,
  onSelect,
  onView,
  onUpdate,
}: {
  items: WorkflowProcessDefinition[]
  selectedId?: string
  onSelect: (item: WorkflowProcessDefinition) => void
  onView: (item: WorkflowProcessDefinition) => void
  onUpdate: (item: WorkflowProcessDefinition) => void
}) {
  const deployMutation = useDeployProcessDefinition()
  const deleteMutation = useDeleteProcessDefinition()
  const [deleteTarget, setDeleteTarget] = useState<WorkflowProcessDefinition | null>(null)

  function confirmDeleteDefinition() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  if (!items.length) return <EmptyState text="Chưa có định nghĩa BPMN. Import file BPMN/XML để bắt đầu." />

  return (
    <>
      <DataShell>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Mã quy trình</TableHead>
            <TableHead>BPMN process</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Deploy</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="w-[20rem]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className={item.id === selectedId ? "bg-muted/40" : ""}>
              <TableCell>
                <button
                  type="button"
                  className="text-left font-medium hover:underline"
                  onClick={() => onSelect(item)}
                >
                  {item.name}
                </button>
                <p className="font-mono text-xs text-muted-foreground">{item.processCode}</p>
              </TableCell>
              <TableCell className="font-mono text-xs">{item.bpmnProcessId}</TableCell>
              <TableCell>v{item.version}</TableCell>
              <TableCell className="font-mono text-xs">
                {item.deploymentKey ?? "Chưa deploy"}
              </TableCell>
              <TableCell><StatusBadge status={item.status} /></TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button type="button" size="icon" variant="outline" onClick={() => onView(item)}>
                    <Eye className="size-4" />
                  </Button>
                  <Button type="button" size="icon" variant="outline" onClick={() => downloadDefinition(item)}>
                    <Download className="size-4" />
                  </Button>
                  <Button type="button" size="icon" variant="outline" onClick={() => onUpdate(item)}>
                    <FileUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={deployMutation.isPending}
                    onClick={() => deployMutation.mutate(item.id)}
                  >
                    <Rocket className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={deleteMutation.isPending}
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </DataShell>
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa định nghĩa quy trình?</AlertDialogTitle>
            <AlertDialogDescription>
              Định nghĩa "{deleteTarget?.name}" sẽ bị xóa khỏi danh sách quản trị. Bản đã deploy trên Zeebe sẽ
              không bị gỡ khỏi engine.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={confirmDeleteDefinition}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function MonitoringTable({
  cases,
  caseTypes,
  onSelect,
}: {
  cases: WorkflowCase[]
  caseTypes: WorkflowCaseType[]
  onSelect: (item: WorkflowCase) => void
}) {
  if (!cases.length) return <EmptyState text="Chưa có hồ sơ quy trình đang theo dõi." />
  const names = new Map(caseTypes.map((item) => [item.caseType, item.operationName]))

  return (
    <DataShell>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Mã hồ sơ</TableHead>
            <TableHead>Nghiệp vụ</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Bước hiện tại</TableHead>
            <TableHead>Process instance</TableHead>
            <TableHead>SLA</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">{item.caseCode}</TableCell>
              <TableCell className="font-medium">{names.get(item.caseType) ?? item.caseType}</TableCell>
              <TableCell><StatusBadge status={item.status} /></TableCell>
              <TableCell>{item.currentStep || "-"}</TableCell>
              <TableCell className="font-mono text-xs">{item.processInstanceKey ?? "Chưa start"}</TableCell>
              <TableCell>{item.slaDueAt ? formatDateTime(item.slaDueAt) : "Chưa có"}</TableCell>
              <TableCell className="text-right">
                <Button type="button" size="sm" variant="outline" onClick={() => onSelect(item)}>
                  <Eye className="size-4" />
                  Mở
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataShell>
  )
}

function MonitoringDetail({ item }: { item: WorkflowCase }) {
  return (
    <aside className="space-y-3 rounded-lg border p-4">
      <div>
        <p className="font-mono text-xs text-muted-foreground">{item.caseCode}</p>
        <h2 className="text-base font-semibold">{item.title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Field label="Trạng thái" value={item.status} />
        <Field label="Bước" value={item.currentStep || "-"} />
        <Field label="Assignee" value={item.assignedTo || "Chưa nhận"} />
        <Field label="Candidate role" value={item.candidateRole || "-"} />
        <Field label="BPMN" value={item.bpmnProcessId || "-"} />
        <Field label="Version" value={String(item.bpmnVersion ?? "-")} />
      </div>
    </aside>
  )
}

function MonitoringCaseList({
  cases,
  selectedId,
  onSelect,
}: {
  cases: WorkflowCase[]
  selectedId?: string
  onSelect: (item: WorkflowCase) => void
}) {
  if (!cases.length) return <EmptyState text="Chưa có instance đang chạy." />

  return (
    <div className="space-y-2">
      {cases.map((item) => (
        <button
          key={item.id}
          type="button"
          className={cn(
            "w-full rounded-lg border p-3 text-left text-sm hover:bg-muted/50",
            item.id === selectedId && "border-primary bg-muted/60"
          )}
          onClick={() => onSelect(item)}
        >
          <span className="block font-medium">{item.caseCode}</span>
          <span className="block truncate text-muted-foreground">{item.title}</span>
          <span className="mt-2 flex items-center justify-between gap-2">
            <StatusBadge status={item.status} />
            <span className="truncate font-mono text-xs text-muted-foreground">
              {item.currentStep || "-"}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}

function ProcessDefinitionDialog({
  item,
  open,
  onOpenChange,
}: {
  item?: WorkflowProcessDefinition | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const importMutation = useImportProcessDefinition()
  const updateMutation = useUpdateProcessDefinition()
  const [form, setForm] = useState({
    processCode: item?.processCode ?? "",
    name: item?.name ?? "",
    status: item?.status ?? "DRAFT",
  })
  const [file, setFile] = useState<File | null>(null)
  const pending = importMutation.isPending || updateMutation.isPending
  const canSave = Boolean(form.name.trim() && file && (item || form.processCode.trim()))

  async function save() {
    if (!file || !canSave) return
    const payload = {
      processCode: form.processCode,
      name: form.name,
      status: form.status,
      file,
    }
    if (item) {
      await updateMutation.mutateAsync({ id: item.id, payload })
    } else {
      await importMutation.mutateAsync(payload)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? "Cập nhật BPMN" : "Import BPMN"}</DialogTitle>
          <DialogDescription>
            Chọn file BPMN/XML. Hệ thống tự đọc process id trong XML để tránh nhập sai.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {item ? (
            <Field label="Mã quy trình" value={item.processCode} />
          ) : (
            <TextInput
              label="Mã quy trình"
              value={form.processCode}
              onChange={(processCode) => setForm({ ...form, processCode })}
            />
          )}
          <TextInput
            label="Tên hiển thị"
            value={form.name}
            onChange={(name) => setForm({ ...form, name })}
          />
          <SelectInput
            label="Trạng thái sau khi import"
            value={form.status}
            options={configStatusOptions}
            onChange={(status) => setForm({ ...form, status })}
          />
          <label className="grid gap-1 text-sm">
            <span className="font-medium">File BPMN/XML</span>
            <Input
              type="file"
              accept=".bpmn,.xml,application/xml,text/xml"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <DialogActions
          onCancel={() => onOpenChange(false)}
          onSave={save}
          pending={pending}
          disabled={!canSave}
        />
      </DialogContent>
    </Dialog>
  )
}

function CaseTypeDialog({
  item,
  open,
  businessAreaOptions,
  roleOptions,
  onOpenChange,
}: {
  item?: WorkflowCaseType | null
  open: boolean
  businessAreaOptions: SelectOption[]
  roleOptions: SelectOption[]
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useSaveCaseType()
  const [form, setForm] = useState({
    caseType: item?.caseType ?? "",
    businessArea: item?.businessArea ?? "",
    operationName: item?.operationName ?? "",
    bpmnProcessId: item?.bpmnProcessId ?? "",
    bpmnVersion: String(item?.bpmnVersion ?? 1),
    workflowEnabled: item?.workflowEnabled ?? true,
    defaultSlaPolicyId: item?.defaultSlaPolicyId ?? "",
    makerRole: item?.makerRole ?? "",
    checkerRole: item?.checkerRole ?? "",
    ownerService: item?.ownerService ?? "",
    status: item?.status ?? "DRAFT",
  })
  const canSave =
    form.caseType &&
    form.businessArea &&
    form.operationName &&
    form.bpmnProcessId &&
    form.makerRole &&
    form.checkerRole &&
    form.ownerService

  async function save() {
    if (!canSave) return
    await mutation.mutateAsync({
      caseType: item?.caseType,
      payload: {
        ...form,
        bpmnVersion: Number(form.bpmnVersion) || 1,
      },
    })
    onOpenChange(false)
  }

  return (
    <ConfigDialog title={item ? "Sửa loại nghiệp vụ" : "Tạo loại nghiệp vụ"} open={open} onOpenChange={onOpenChange}>
      <TextInput label="Mã loại nghiệp vụ" value={form.caseType} onChange={(caseType) => setForm({ ...form, caseType })} disabled={Boolean(item)} />
      <SelectInput label="Nhóm menu" value={form.businessArea} options={businessAreaOptions} onChange={(businessArea) => setForm({ ...form, businessArea })} />
      <TextInput label="Tên vận hành" value={form.operationName} onChange={(operationName) => setForm({ ...form, operationName })} />
      <SelectInput label="Owner service" value={form.ownerService} options={ownerServiceOptions} onChange={(ownerService) => setForm({ ...form, ownerService })} />
      <TextInput label="BPMN process id" value={form.bpmnProcessId} onChange={(bpmnProcessId) => setForm({ ...form, bpmnProcessId })} />
      <TextInput label="BPMN version" value={form.bpmnVersion} onChange={(bpmnVersion) => setForm({ ...form, bpmnVersion })} />
      <SearchSelect label="Maker role" value={form.makerRole} options={roleOptions} allowCustom onChange={(makerRole) => setForm({ ...form, makerRole })} />
      <SearchSelect label="Checker role" value={form.checkerRole} options={roleOptions} allowCustom onChange={(checkerRole) => setForm({ ...form, checkerRole })} />
      <SelectInput label="Trạng thái" value={form.status} options={configStatusOptions} onChange={(status) => setForm({ ...form, status })} />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.workflowEnabled}
          onChange={(event) => setForm({ ...form, workflowEnabled: event.target.checked })}
        />
        Bật workflow
      </label>
      <DialogActions
        onCancel={() => onOpenChange(false)}
        onSave={save}
        pending={mutation.isPending}
        disabled={!canSave}
      />
    </ConfigDialog>
  )
}

function ProcessConfigDialog({
  item,
  roleOptions,
  slaOptions,
  onOpenChange,
}: {
  item?: WorkflowCaseType
  roleOptions: SelectOption[]
  slaOptions: SelectOption[]
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useUpdateProcessConfig()
  const [form, setForm] = useState({
    bpmnProcessId: item?.bpmnProcessId ?? "",
    bpmnVersion: String(item?.bpmnVersion ?? 1),
    workflowEnabled: item?.workflowEnabled ?? true,
    defaultSlaPolicyId: item?.defaultSlaPolicyId ?? "",
    makerRole: item?.makerRole ?? "",
    checkerRole: item?.checkerRole ?? "",
    status: item?.status ?? "ACTIVE",
  })

  async function save() {
    if (!item) return
    await mutation.mutateAsync({
      caseType: item.caseType,
      payload: {
        ...form,
        bpmnVersion: Number(form.bpmnVersion) || 1,
      },
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cấu hình quy trình</DialogTitle>
          <DialogDescription>{item?.caseType}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <TextInput label="BPMN process id" value={form.bpmnProcessId} onChange={(bpmnProcessId) => setForm({ ...form, bpmnProcessId })} />
          <TextInput label="BPMN version" value={form.bpmnVersion} onChange={(bpmnVersion) => setForm({ ...form, bpmnVersion })} />
          <SearchSelect label="SLA mặc định" value={form.defaultSlaPolicyId} options={slaOptions} emptyLabel="Không gán SLA" onChange={(defaultSlaPolicyId) => setForm({ ...form, defaultSlaPolicyId })} />
          <SearchSelect label="Maker role" value={form.makerRole} options={roleOptions} allowCustom onChange={(makerRole) => setForm({ ...form, makerRole })} />
          <SearchSelect label="Checker role" value={form.checkerRole} options={roleOptions} allowCustom onChange={(checkerRole) => setForm({ ...form, checkerRole })} />
          <SelectInput label="Trạng thái" value={form.status} options={configStatusOptions} onChange={(status) => setForm({ ...form, status })} />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.workflowEnabled}
              onChange={(event) => setForm({ ...form, workflowEnabled: event.target.checked })}
            />
            Bật workflow
          </label>
          <DialogActions onCancel={() => onOpenChange(false)} onSave={save} pending={mutation.isPending} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SlaPolicyDialog({
  item,
  open,
  caseTypeOptions,
  roleOptions,
  onOpenChange,
}: {
  item?: SlaPolicy | null
  open: boolean
  caseTypeOptions: SelectOption[]
  roleOptions: SelectOption[]
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useSaveSlaPolicy()
  const [form, setForm] = useState({
    code: item?.code ?? "",
    name: item?.name ?? "",
    caseType: item?.caseType ?? "",
    dueInHours: String(item?.dueInHours ?? 8),
    warningInHours: String(item?.warningInHours ?? 2),
    escalationRole: item?.escalationRole ?? "",
    status: item?.status ?? "ACTIVE",
    effectiveFrom: toDateInputValue(item?.effectiveFrom) || todayDateInput(),
    effectiveTo: toDateInputValue(item?.effectiveTo),
    taskPolicies:
      item?.taskPolicies?.length
        ? item.taskPolicies.map(toSlaTaskForm)
        : [newSlaTaskPolicy(10, item?.escalationRole)],
  })
  const canSave = form.code && form.name && form.caseType && form.escalationRole && form.taskPolicies.length > 0

  async function save() {
    if (!canSave) return
    const summary = summarizeSlaTasks(form.taskPolicies)
    await mutation.mutateAsync({
      id: item?.id,
      payload: {
        ...form,
        dueInHours: summary.dueInHours,
        warningInHours: summary.warningInHours,
        effectiveFrom: fromDateInputValue(form.effectiveFrom),
        effectiveTo: fromDateInputValue(form.effectiveTo),
        taskPolicies: form.taskPolicies.map((task, index) => ({
          ...task,
          durationValue: Number(task.durationValue) || 1,
          warningValue: Number(task.warningValue) || 0,
          sortOrder: Number(task.sortOrder) || (index + 1) * 10,
          effectiveFrom: fromDateInputValue(task.effectiveFrom),
          effectiveTo: fromDateInputValue(task.effectiveTo),
        })),
      },
    })
    onOpenChange(false)
  }

  return (
    <ConfigDialog title={item ? "Sửa SLA" : "Tạo SLA"} open={open} wide onOpenChange={onOpenChange}>
      <div className="grid gap-3 lg:grid-cols-3">
        <TextInput label="Mã SLA" value={form.code} onChange={(code) => setForm({ ...form, code })} />
        <TextInput label="Tên SLA" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <SearchSelect label="Loại nghiệp vụ" value={form.caseType} options={caseTypeOptions} onChange={(caseType) => setForm({ ...form, caseType })} />
        <SearchSelect label="Escalation role mặc định" value={form.escalationRole} options={roleOptions} allowCustom onChange={(escalationRole) => setForm({ ...form, escalationRole })} />
        <DateInput label="Ngày hiệu lực" value={form.effectiveFrom} onChange={(effectiveFrom) => setForm({ ...form, effectiveFrom })} />
        <DateInput label="Ngày hết hiệu lực" value={form.effectiveTo} onChange={(effectiveTo) => setForm({ ...form, effectiveTo })} />
        <SelectInput label="Trạng thái" value={form.status} options={configStatusOptions} onChange={(status) => setForm({ ...form, status })} />
      </div>

      <SlaTaskPolicyEditor
        items={form.taskPolicies}
        roleOptions={roleOptions}
        defaultEscalationRole={form.escalationRole}
        onChange={(taskPolicies) => setForm({ ...form, taskPolicies })}
      />

      <DialogActions
        onCancel={() => onOpenChange(false)}
        onSave={save}
        pending={mutation.isPending}
        disabled={!canSave}
      />
    </ConfigDialog>
  )
}

type SlaTaskForm = Omit<
  SlaTaskPolicy,
  "durationValue" | "warningValue" | "sortOrder" | "effectiveFrom" | "effectiveTo"
> & {
  durationValue: string
  warningValue: string
  sortOrder: string
  effectiveFrom: string
  effectiveTo: string
}

function SlaTaskPolicyEditor({
  items,
  roleOptions,
  defaultEscalationRole,
  onChange,
}: {
  items: SlaTaskForm[]
  roleOptions: SelectOption[]
  defaultEscalationRole: string
  onChange: (items: SlaTaskForm[]) => void
}) {
  function update(index: number, patch: Partial<SlaTaskForm>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Tác vụ trong quy trình</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...items, newSlaTaskPolicy((items.length + 1) * 10, defaultEscalationRole)])}
        >
          <Plus className="size-4" />
          Thêm tác vụ
        </Button>
      </div>
      <DataShell>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="min-w-36">Mã bước</TableHead>
              <TableHead className="min-w-44">Tên tác vụ</TableHead>
              <TableHead className="min-w-24">Thời hạn</TableHead>
              <TableHead className="min-w-28">Đơn vị</TableHead>
              <TableHead className="min-w-28">Kiểu cảnh báo</TableHead>
              <TableHead className="min-w-24">Cảnh báo</TableHead>
              <TableHead className="min-w-28">Đơn vị CB</TableHead>
              <TableHead className="min-w-44">Escalation</TableHead>
              <TableHead className="min-w-36">Hiệu lực</TableHead>
              <TableHead className="min-w-36">Hết hiệu lực</TableHead>
              <TableHead className="min-w-28">Trạng thái</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.id || index}>
                <TableCell>
                  <Input value={item.stepCode} onChange={(event) => update(index, { stepCode: event.target.value })} />
                </TableCell>
                <TableCell>
                  <Input value={item.taskName} onChange={(event) => update(index, { taskName: event.target.value })} />
                </TableCell>
                <TableCell>
                  <Input type="number" min={1} value={item.durationValue} onChange={(event) => update(index, { durationValue: event.target.value })} />
                </TableCell>
                <TableCell>
                  <InlineSelect value={item.durationUnit} options={durationUnitOptions} onChange={(durationUnit) => update(index, { durationUnit: durationUnit as SlaTaskForm["durationUnit"] })} />
                </TableCell>
                <TableCell>
                  <InlineSelect value={item.warningMode} options={warningModeOptions} onChange={(warningMode) => update(index, { warningMode: warningMode as SlaTaskForm["warningMode"], warningUnit: warningMode === "PERCENT" ? "PERCENT" : item.warningUnit === "PERCENT" ? "MINUTE" : item.warningUnit })} />
                </TableCell>
                <TableCell>
                  <Input type="number" min={0} value={item.warningValue} onChange={(event) => update(index, { warningValue: event.target.value })} />
                </TableCell>
                <TableCell>
                  <InlineSelect value={item.warningUnit} options={warningUnitOptions(item.warningMode)} onChange={(warningUnit) => update(index, { warningUnit: warningUnit as SlaTaskForm["warningUnit"] })} />
                </TableCell>
                <TableCell>
                  <SearchSelect value={item.escalationRole} options={roleOptions} allowCustom onChange={(escalationRole) => update(index, { escalationRole })} />
                </TableCell>
                <TableCell>
                  <Input type="date" value={item.effectiveFrom} onChange={(event) => update(index, { effectiveFrom: event.target.value })} />
                </TableCell>
                <TableCell>
                  <Input type="date" value={item.effectiveTo} onChange={(event) => update(index, { effectiveTo: event.target.value })} />
                </TableCell>
                <TableCell>
                  <InlineSelect value={item.status} options={configStatusOptions} onChange={(status) => update(index, { status })} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={items.length === 1}
                    onClick={() => onChange(items.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataShell>
    </div>
  )
}

function DescriptionTemplateDialog({
  item,
  open,
  caseTypeOptions,
  subsystemOptions,
  onOpenChange,
}: {
  item?: DescriptionTemplate | null
  open: boolean
  caseTypeOptions: SelectOption[]
  subsystemOptions: SelectOption[]
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useSaveDescriptionTemplate()
  const [form, setForm] = useState({
    code: item?.code ?? "",
    businessSubsystem: item?.businessSubsystem ?? "FAC",
    caseType: item?.caseType ?? "",
    pattern: item?.pattern ?? "",
    status: item?.status ?? "ACTIVE",
  })
  const tokens = templateTokens(form.businessSubsystem)
  const preview = renderDescriptionPreview(form.pattern)
  const canSave = form.code && form.businessSubsystem && form.caseType && form.pattern

  function insertToken(token: string) {
    const next = form.pattern ? `${form.pattern} {${token}}` : `{${token}}`
    setForm({ ...form, pattern: next })
  }

  async function save() {
    if (!canSave) return
    await mutation.mutateAsync({ id: item?.id, payload: { ...form, preview } })
    onOpenChange(false)
  }

  return (
    <ConfigDialog title={item ? "Sửa cấu trúc diễn giải" : "Tạo cấu trúc diễn giải"} open={open} wide onOpenChange={onOpenChange}>
      <div className="grid gap-3 lg:grid-cols-2">
        <TextInput label="Mã cấu trúc" value={form.code} onChange={(code) => setForm({ ...form, code })} />
        <SelectInput label="Phân hệ nghiệp vụ" value={form.businessSubsystem} options={subsystemOptions} onChange={(businessSubsystem) => setForm({ ...form, businessSubsystem })} />
        <SearchSelect label="Loại nghiệp vụ" value={form.caseType} options={caseTypeOptions} onChange={(caseType) => setForm({ ...form, caseType })} />
        <SelectInput label="Trạng thái" value={form.status} options={configStatusOptions} onChange={(status) => setForm({ ...form, status })} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Cấu trúc diễn giải</span>
          <Textarea
            className="min-h-32 font-mono"
            value={form.pattern}
            onChange={(event) => setForm({ ...form, pattern: event.target.value })}
          />
        </label>
        <div className="space-y-2">
          <p className="text-sm font-medium">Chèn trường dữ liệu</p>
          <div className="flex flex-wrap gap-2">
            {tokens.map((token) => (
              <Button
                key={token.value}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => insertToken(token.value)}
              >
                {token.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-xs font-medium text-muted-foreground">Xem trước</p>
        <p className="mt-1 break-words text-sm">{preview || "Chưa có cấu trúc diễn giải."}</p>
      </div>

      <DialogActions
        onCancel={() => onOpenChange(false)}
        onSave={save}
        pending={mutation.isPending}
        disabled={!canSave}
      />
    </ConfigDialog>
  )
}

function ProcessRoleDialog({
  item,
  open,
  caseTypeOptions,
  iamRoleOptions,
  onOpenChange,
}: {
  item?: ProcessRole | null
  open: boolean
  caseTypeOptions: SelectOption[]
  iamRoleOptions: SelectOption[]
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useSaveProcessRole()
  const [form, setForm] = useState({
    caseType: item?.caseType ?? "",
    stepCode: item?.stepCode ?? "",
    businessRole: item?.businessRole ?? "",
    iamRole: item?.iamRole ?? "",
    actionScope: item?.actionScope ?? "",
    status: item?.status ?? "ACTIVE",
  })

  async function save() {
    await mutation.mutateAsync({ id: item?.id, payload: form })
    onOpenChange(false)
  }

  return (
    <ConfigDialog title={item ? "Sửa vai trò quy trình" : "Tạo vai trò quy trình"} open={open} onOpenChange={onOpenChange}>
      <SearchSelect label="Loại nghiệp vụ" value={form.caseType} options={caseTypeOptions} onChange={(caseType) => setForm({ ...form, caseType })} />
      <TextInput label="Bước quy trình" value={form.stepCode} onChange={(stepCode) => setForm({ ...form, stepCode })} />
      <TextInput label="Vai trò nghiệp vụ" value={form.businessRole} onChange={(businessRole) => setForm({ ...form, businessRole })} />
      <SearchSelect label="IAM role" value={form.iamRole} options={iamRoleOptions} allowCustom onChange={(iamRole) => setForm({ ...form, iamRole })} />
      <SelectInput label="Quyền thao tác" value={form.actionScope} options={actionScopeOptions} onChange={(actionScope) => setForm({ ...form, actionScope })} />
      <SelectInput label="Trạng thái" value={form.status} options={configStatusOptions} onChange={(status) => setForm({ ...form, status })} />
      <DialogActions onCancel={() => onOpenChange(false)} onSave={save} pending={mutation.isPending} />
    </ConfigDialog>
  )
}

function RoleCatalogDialog({
  item,
  open,
  onOpenChange,
}: {
  item?: WorkflowRoleCatalog | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useSaveRoleCatalog()
  const [form, setForm] = useState({
    roleCode: item?.roleCode ?? "",
    roleName: item?.roleName ?? "",
    roleType: item?.roleType ?? "MAKER",
    businessSubsystem: item?.businessSubsystem ?? "FAC",
    status: item?.status ?? "ACTIVE",
  })
  const canSave = form.roleCode && form.roleName && form.roleType && form.businessSubsystem

  async function save() {
    if (!canSave) return
    await mutation.mutateAsync({ roleCode: item?.roleCode, payload: form })
    onOpenChange(false)
  }

  return (
    <ConfigDialog title={item ? "Sửa role vận hành" : "Tạo role vận hành"} open={open} onOpenChange={onOpenChange}>
      <TextInput label="Role code" value={form.roleCode} disabled={Boolean(item)} onChange={(roleCode) => setForm({ ...form, roleCode })} />
      <TextInput label="Tên role" value={form.roleName} onChange={(roleName) => setForm({ ...form, roleName })} />
      <SelectInput label="Loại role" value={form.roleType} options={roleTypeOptions} onChange={(roleType) => setForm({ ...form, roleType })} />
      <SelectInput label="Phân hệ" value={form.businessSubsystem} options={businessSubsystemOptions} onChange={(businessSubsystem) => setForm({ ...form, businessSubsystem })} />
      <SelectInput label="Trạng thái" value={form.status} options={configStatusOptions} onChange={(status) => setForm({ ...form, status })} />
      <DialogActions onCancel={() => onOpenChange(false)} onSave={save} pending={mutation.isPending} disabled={!canSave} />
    </ConfigDialog>
  )
}

function RoleMembershipDialog({
  item,
  open,
  roleOptions,
  onOpenChange,
}: {
  item?: WorkflowRoleMembership | null
  open: boolean
  roleOptions: SelectOption[]
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useSaveRoleMembership()
  const [form, setForm] = useState({
    roleCode: item?.roleCode ?? "",
    principalType: item?.principalType ?? "USER",
    principalId: item?.principalId ?? "",
    tenantId: item?.tenantId ?? "",
    orgId: item?.orgId ?? "",
    branchId: item?.branchId ?? "",
    productCode: item?.productCode ?? "",
    minAmount: item?.minAmount ? String(item.minAmount) : "",
    maxAmount: item?.maxAmount ? String(item.maxAmount) : "",
    effectiveFrom: toDateInputValue(item?.effectiveFrom) || todayDateInput(),
    effectiveTo: toDateInputValue(item?.effectiveTo),
    status: item?.status ?? "ACTIVE",
  })
  const canSave = form.roleCode && form.principalType && form.principalId

  async function save() {
    if (!canSave) return
    await mutation.mutateAsync({
      id: item?.id,
      payload: {
        ...form,
        minAmount: numberOrUndefined(form.minAmount),
        maxAmount: numberOrUndefined(form.maxAmount),
        effectiveFrom: fromDateInputValue(form.effectiveFrom),
        effectiveTo: fromDateInputValue(form.effectiveTo),
      },
    })
    onOpenChange(false)
  }

  return (
    <ConfigDialog title={item ? "Sửa thành viên role" : "Thêm thành viên role"} open={open} onOpenChange={onOpenChange}>
      <SearchSelect label="Role" value={form.roleCode} options={roleOptions} onChange={(roleCode) => setForm({ ...form, roleCode })} />
      <SelectInput label="Loại principal" value={form.principalType} options={principalTypeOptions} onChange={(principalType) => setForm({ ...form, principalType })} />
      <TextInput label="User/group id" value={form.principalId} onChange={(principalId) => setForm({ ...form, principalId })} />
      <div className="grid gap-3 md:grid-cols-2">
        <TextInput label="Tenant" value={form.tenantId} onChange={(tenantId) => setForm({ ...form, tenantId })} />
        <TextInput label="Đơn vị" value={form.orgId} onChange={(orgId) => setForm({ ...form, orgId })} />
        <TextInput label="Chi nhánh" value={form.branchId} onChange={(branchId) => setForm({ ...form, branchId })} />
        <TextInput label="Sản phẩm" value={form.productCode} onChange={(productCode) => setForm({ ...form, productCode })} />
        <TextInput label="Hạn mức từ" value={form.minAmount} onChange={(minAmount) => setForm({ ...form, minAmount })} />
        <TextInput label="Hạn mức đến" value={form.maxAmount} onChange={(maxAmount) => setForm({ ...form, maxAmount })} />
        <DateInput label="Ngày hiệu lực" value={form.effectiveFrom} onChange={(effectiveFrom) => setForm({ ...form, effectiveFrom })} />
        <DateInput label="Ngày hết hiệu lực" value={form.effectiveTo} onChange={(effectiveTo) => setForm({ ...form, effectiveTo })} />
      </div>
      <SelectInput label="Trạng thái" value={form.status} options={configStatusOptions} onChange={(status) => setForm({ ...form, status })} />
      <DialogActions onCancel={() => onOpenChange(false)} onSave={save} pending={mutation.isPending} disabled={!canSave} />
    </ConfigDialog>
  )
}

function AssignmentRuleDialog({
  item,
  open,
  caseTypeOptions,
  roleOptions,
  onOpenChange,
}: {
  item?: WorkflowAssignmentRule | null
  open: boolean
  caseTypeOptions: SelectOption[]
  roleOptions: SelectOption[]
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useSaveAssignmentRule()
  const [form, setForm] = useState({
    caseType: item?.caseType ?? "",
    stepCode: item?.stepCode ?? "",
    roleCode: item?.roleCode ?? "",
    assignmentMode: item?.assignmentMode ?? "CANDIDATE_POOL",
    requireSeparationOfDuties: item?.requireSeparationOfDuties ?? true,
    fallbackRoleCode: item?.fallbackRoleCode ?? "",
    priority: String(item?.priority ?? 100),
    status: item?.status ?? "ACTIVE",
  })
  const canSave = form.caseType && form.stepCode && form.roleCode && form.assignmentMode

  async function save() {
    if (!canSave) return
    await mutation.mutateAsync({
      id: item?.id,
      payload: {
        ...form,
        priority: Number(form.priority) || 100,
      },
    })
    onOpenChange(false)
  }

  return (
    <ConfigDialog title={item ? "Sửa luật phân công" : "Tạo luật phân công"} open={open} onOpenChange={onOpenChange}>
      <SearchSelect label="Loại nghiệp vụ" value={form.caseType} options={caseTypeOptions} onChange={(caseType) => setForm({ ...form, caseType })} />
      <TextInput label="Bước quy trình" value={form.stepCode} onChange={(stepCode) => setForm({ ...form, stepCode })} />
      <SearchSelect label="Role xử lý" value={form.roleCode} options={roleOptions} onChange={(roleCode) => setForm({ ...form, roleCode })} />
      <SelectInput label="Cách phân công" value={form.assignmentMode} options={assignmentModeOptions} onChange={(assignmentMode) => setForm({ ...form, assignmentMode })} />
      <SearchSelect label="Fallback role" value={form.fallbackRoleCode} options={roleOptions} emptyLabel="Không có" onChange={(fallbackRoleCode) => setForm({ ...form, fallbackRoleCode })} />
      <TextInput label="Ưu tiên" value={form.priority} onChange={(priority) => setForm({ ...form, priority })} />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.requireSeparationOfDuties}
          onChange={(event) => setForm({ ...form, requireSeparationOfDuties: event.target.checked })}
        />
        Bắt buộc tách maker/checker
      </label>
      <SelectInput label="Trạng thái" value={form.status} options={configStatusOptions} onChange={(status) => setForm({ ...form, status })} />
      <DialogActions onCancel={() => onOpenChange(false)} onSave={save} pending={mutation.isPending} disabled={!canSave} />
    </ConfigDialog>
  )
}

function DelegationDialog({
  item,
  open,
  roleOptions,
  onOpenChange,
}: {
  item?: WorkflowDelegation | null
  open: boolean
  roleOptions: SelectOption[]
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useSaveDelegation()
  const [form, setForm] = useState({
    fromPrincipalId: item?.fromPrincipalId ?? "",
    toPrincipalId: item?.toPrincipalId ?? "",
    roleCode: item?.roleCode ?? "",
    effectiveFrom: toDateInputValue(item?.effectiveFrom) || todayDateInput(),
    effectiveTo: toDateInputValue(item?.effectiveTo),
    reason: item?.reason ?? "",
    status: item?.status ?? "ACTIVE",
  })
  const canSave = form.fromPrincipalId && form.toPrincipalId && form.roleCode

  async function save() {
    if (!canSave) return
    await mutation.mutateAsync({
      id: item?.id,
      payload: {
        ...form,
        effectiveFrom: fromDateInputValue(form.effectiveFrom),
        effectiveTo: fromDateInputValue(form.effectiveTo),
      },
    })
    onOpenChange(false)
  }

  return (
    <ConfigDialog title={item ? "Sửa ủy quyền" : "Tạo ủy quyền"} open={open} onOpenChange={onOpenChange}>
      <SearchSelect label="Role được ủy quyền" value={form.roleCode} options={roleOptions} onChange={(roleCode) => setForm({ ...form, roleCode })} />
      <TextInput label="Từ user" value={form.fromPrincipalId} onChange={(fromPrincipalId) => setForm({ ...form, fromPrincipalId })} />
      <TextInput label="Sang user" value={form.toPrincipalId} onChange={(toPrincipalId) => setForm({ ...form, toPrincipalId })} />
      <DateInput label="Ngày hiệu lực" value={form.effectiveFrom} onChange={(effectiveFrom) => setForm({ ...form, effectiveFrom })} />
      <DateInput label="Ngày hết hiệu lực" value={form.effectiveTo} onChange={(effectiveTo) => setForm({ ...form, effectiveTo })} />
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Lý do</span>
        <Textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
      </label>
      <SelectInput label="Trạng thái" value={form.status} options={configStatusOptions} onChange={(status) => setForm({ ...form, status })} />
      <DialogActions onCancel={() => onOpenChange(false)} onSave={save} pending={mutation.isPending} disabled={!canSave} />
    </ConfigDialog>
  )
}

function ConfigDialog({
  title,
  open,
  onOpenChange,
  wide,
  children,
}: {
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(wide && "max-w-[min(96vw,1200px)]")}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Thay đổi sẽ được lưu vào workflow-service.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">{children}</div>
      </DialogContent>
    </Dialog>
  )
}

function TextInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      <Input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      <Input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

type SelectOption = {
  value: string
  label: string
  description?: string
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Chọn giá trị" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

function InlineSelect({
  value,
  options,
  onChange,
}: {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Chọn" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function SearchSelect({
  label,
  value,
  options,
  emptyLabel,
  allowCustom,
  onChange,
}: {
  label?: string
  value: string
  options: SelectOption[]
  emptyLabel?: string
  allowCustom?: boolean
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const selected = options.find((option) => option.value === value)
  const customValue = search.trim()
  const canUseCustom =
    allowCustom &&
    customValue &&
    !options.some((option) => option.value.toLowerCase() === customValue.toLowerCase())

  return (
    <label className="grid gap-1 text-sm">
      {label ? <span className="font-medium">{label}</span> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between font-normal"
          >
            <span className="truncate">
              {selected?.label || value || emptyLabel || "Chọn giá trị"}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder="Tìm theo mã hoặc tên"
            />
            <CommandList>
              <CommandEmpty>Không có dữ liệu phù hợp.</CommandEmpty>
              <CommandGroup>
                {emptyLabel ? (
                  <CommandItem
                    value="__empty__"
                    onSelect={() => {
                      onChange("")
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("size-4", value === "" ? "opacity-100" : "opacity-0")} />
                    {emptyLabel}
                  </CommandItem>
                ) : null}
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.value} ${option.label} ${option.description ?? ""}`}
                    onSelect={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("size-4", value === option.value ? "opacity-100" : "opacity-0")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{option.label}</span>
                      {option.description ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                  </CommandItem>
                ))}
                {canUseCustom ? (
                  <CommandItem
                    value={customValue}
                    onSelect={() => {
                      onChange(customValue)
                      setOpen(false)
                    }}
                  >
                    <Check className="size-4 opacity-0" />
                    Dùng giá trị "{customValue}"
                  </CommandItem>
                ) : null}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </label>
  )
}

function DialogActions({
  onCancel,
  onSave,
  pending,
  disabled,
}: {
  onCancel: () => void
  onSave: () => void | Promise<void>
  pending: boolean
  disabled?: boolean
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        Đóng
      </Button>
      <Button type="button" onClick={onSave} disabled={pending || disabled}>
        {pending ? "Đang lưu" : "Lưu"}
      </Button>
    </div>
  )
}

function MetricStrip({
  metrics,
}: {
  metrics: { label: string; value: string; tone: "default" | "success" | "warning" | "error" }[]
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {metrics.map((item) => (
        <div key={item.label} className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className={cn("text-2xl font-semibold", metricTone(item.tone))}>{item.value}</p>
        </div>
      ))}
    </div>
  )
}

function MockNotice() {
  return (
    <Alert>
      <AlertCircle className="size-4" />
      <AlertTitle>Đang dùng dữ liệu mẫu cho phần chưa có API</AlertTitle>
      <AlertDescription>
        Các màn đã cố đọc workflow-service trước; endpoint nào chưa tồn tại mới dùng seed local để giữ trải nghiệm vận hành.
      </AlertDescription>
    </Alert>
  )
}

function LoadingBlock() {
  return (
    <div className="flex justify-center rounded-lg border p-8">
      <Spinner className="size-6" />
    </div>
  )
}

function DataShell({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-lg border">{children}</div>
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-md border p-3 text-sm text-muted-foreground">{text}</div>
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground/70">{label}</p>
      <p className="break-words font-medium text-foreground">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "ACTIVE" || status === "COMPLETED" ? "secondary" : "outline"
  return <Badge variant={variant}>{status}</Badge>
}

async function downloadDefinition(item: WorkflowProcessDefinition) {
  const xml = item.xmlContent || await workflowApi.getProcessDefinitionXml(item.id)
  downloadText(xml, item.resourceName || `${item.bpmnProcessId}.bpmn`, "application/xml")
}

function downloadText(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type: `${type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function monitoringMetrics(cases: WorkflowCase[]) {
  const running = cases.filter((item) => !["COMPLETED", "CANCELLED"].includes(item.status)).length
  const incidents = cases.filter((item) => ["FAILED", "SUSPENDED"].includes(item.status)).length
  const overdue = cases.filter((item) => item.slaDueAt && new Date(item.slaDueAt).getTime() < Date.now()).length

  return [
    { label: "Đang chạy", value: String(running), tone: "default" as const },
    { label: "Quá hạn SLA", value: String(overdue), tone: overdue ? "warning" as const : "success" as const },
    { label: "Incident", value: String(incidents), tone: incidents ? "error" as const : "success" as const },
  ]
}

function metricTone(tone: "default" | "success" | "warning" | "error") {
  if (tone === "success") return "text-emerald-600"
  if (tone === "warning") return "text-amber-600"
  if (tone === "error") return "text-destructive"
  return ""
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

const configStatusOptions: SelectOption[] = [
  { value: "DRAFT", label: "Bản nháp" },
  { value: "ACTIVE", label: "Đang áp dụng" },
  { value: "INACTIVE", label: "Ngừng áp dụng" },
]

const defaultBusinessAreaOptions: SelectOption[] = [
  { value: "CUSTOMER", label: "Khách hàng hội viên" },
  { value: "FINANCE", label: "Kế toán" },
  { value: "WORKFLOW", label: "Quy trình" },
]

const ownerServiceOptions: SelectOption[] = [
  { value: "crm-service", label: "crm-service" },
  { value: "finance-service", label: "finance-service" },
  { value: "workflow-service", label: "workflow-service" },
]

const actionScopeOptions: SelectOption[] = [
  { value: "claim,save,submit", label: "Tiếp nhận, lưu, trình duyệt" },
  { value: "approve,reject,suspend", label: "Duyệt, từ chối, tạm treo" },
  { value: "review,request_supplement", label: "Rà soát, yêu cầu bổ sung" },
  { value: "monitor,reassign,retry", label: "Giám sát, phân công, chạy lại" },
]

const roleTypeOptions: SelectOption[] = [
  { value: "MAKER", label: "Maker" },
  { value: "CHECKER", label: "Checker" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "OPS_ADMIN", label: "Operations admin" },
  { value: "CUSTOM", label: "Khác" },
]

const principalTypeOptions: SelectOption[] = [
  { value: "USER", label: "User" },
  { value: "GROUP", label: "Group" },
]

const assignmentModeOptions: SelectOption[] = [
  { value: "CANDIDATE_POOL", label: "Candidate pool" },
  { value: "AUTO_ASSIGN", label: "Tự động gán" },
  { value: "ROUND_ROBIN", label: "Chia vòng" },
  { value: "SUPERVISOR_QUEUE", label: "Queue giám sát" },
]

const businessSubsystemOptions: SelectOption[] = [
  { value: "LNM", label: "LNM - Cho vay" },
  { value: "DPM", label: "DPM - Huy động tiền gửi" },
  { value: "FAC", label: "FAC - Kế toán" },
  { value: "IBM", label: "IBM - Tiền gửi TCTD khác" },
  { value: "CRM", label: "CRM - Khách hàng" },
  { value: "HRM", label: "HRM - Nhân sự" },
  { value: "CFM", label: "CFM - Nguồn vốn" },
]

const durationUnitOptions: SelectOption[] = [
  { value: "MINUTE", label: "Phút" },
  { value: "HOUR", label: "Giờ" },
]

const warningModeOptions: SelectOption[] = [
  { value: "ABSOLUTE", label: "Theo số" },
  { value: "PERCENT", label: "Theo %" },
]

function warningUnitOptions(mode: string): SelectOption[] {
  if (mode === "PERCENT") return [{ value: "PERCENT", label: "%" }]
  return durationUnitOptions
}

function caseTypeOptionsFromCaseTypes(items: WorkflowCaseType[]): SelectOption[] {
  return items.map((item) => ({
    value: item.caseType,
    label: `${item.caseType} - ${item.operationName}`,
    description: item.businessArea,
  }))
}

function roleOptionsFromCaseTypes(items: WorkflowCaseType[]): SelectOption[] {
  return uniqueOptions(items.flatMap((item) => [item.makerRole, item.checkerRole]), [])
}

function uniqueOptions(values: string[], presets: SelectOption[]) {
  const seen = new Set(presets.map((item) => item.value))
  const out = [...presets]
  for (const value of values) {
    if (!value || seen.has(value)) continue
    seen.add(value)
    out.push({ value, label: value })
  }
  return out
}

function subsystemLabel(value: string) {
  return businessSubsystemOptions.find((item) => item.value === value)?.label ?? value
}

function templateTokens(subsystem: string): SelectOption[] {
  const common = [
    { value: "caseCode", label: "Mã hồ sơ" },
    { value: "caseTitle", label: "Tiêu đề" },
    { value: "operationName", label: "Nghiệp vụ" },
    { value: "currentStep", label: "Bước xử lý" },
    { value: "createdDate", label: "Ngày tạo" },
  ]
  const bySubsystem: Record<string, SelectOption[]> = {
    FAC: [
      { value: "amount", label: "Số tiền" },
      { value: "currency", label: "Tiền tệ" },
      { value: "counterpartyName", label: "Đối tác" },
      { value: "debitAccount", label: "TK nợ" },
      { value: "creditAccount", label: "TK có" },
    ],
    CRM: [
      { value: "customerName", label: "Khách hàng" },
      { value: "customerNo", label: "Mã KH" },
      { value: "identityNo", label: "Định danh" },
      { value: "riskLevel", label: "Mức rủi ro" },
    ],
    LNM: [
      { value: "loanAccount", label: "Tài khoản vay" },
      { value: "loanProduct", label: "Sản phẩm vay" },
      { value: "principalAmount", label: "Dư nợ gốc" },
    ],
    DPM: [
      { value: "depositAccount", label: "TK tiền gửi" },
      { value: "depositProduct", label: "Sản phẩm TG" },
      { value: "term", label: "Kỳ hạn" },
    ],
    IBM: [
      { value: "bankName", label: "TCTD" },
      { value: "nostroAccount", label: "TK Nostro" },
      { value: "settlementDate", label: "Ngày thanh toán" },
    ],
    HRM: [
      { value: "employeeCode", label: "Mã NV" },
      { value: "employeeName", label: "Nhân sự" },
      { value: "departmentName", label: "Phòng ban" },
    ],
    CFM: [
      { value: "fundingSource", label: "Nguồn vốn" },
      { value: "dealCode", label: "Mã giao dịch vốn" },
      { value: "maturityDate", label: "Ngày đáo hạn" },
    ],
  }
  return [...common, ...(bySubsystem[subsystem] ?? [])]
}

function renderDescriptionPreview(pattern: string) {
  const sample: Record<string, string> = {
    amount: "125.000.000",
    bankName: "BIDV",
    caseCode: "FAC-20260702-001",
    caseTitle: "Giao dịch đến",
    counterpartyName: "Công ty Minh An",
    createdDate: "02/07/2026",
    creditAccount: "421101001",
    currency: "VND",
    currentStep: "Duyệt bút toán",
    customerName: "Nguyễn Hoàng Nam",
    customerNo: "CUS000912",
    debitAccount: "101101001",
    dealCode: "CFM-00042",
    departmentName: "Khối vận hành",
    depositAccount: "DPM000012",
    depositProduct: "Tiền gửi có kỳ hạn",
    employeeCode: "E00128",
    employeeName: "Trần Minh Anh",
    fundingSource: "Nguồn vốn ngắn hạn",
    identityNo: "012345678901",
    loanAccount: "LNM000088",
    loanProduct: "Vay kinh doanh",
    maturityDate: "31/12/2026",
    nostroAccount: "IBM-NOSTRO-01",
    operationName: "Giao dịch đến",
    principalAmount: "2.500.000.000",
    riskLevel: "Cao",
    settlementDate: "02/07/2026",
    term: "12 tháng",
  }
  return pattern.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => sample[key] ?? `{${key}}`)
}

function toSlaTaskForm(task: SlaTaskPolicy): SlaTaskForm {
  return {
    ...task,
    durationValue: String(task.durationValue),
    warningValue: String(task.warningValue),
    sortOrder: String(task.sortOrder || 10),
    effectiveFrom: toDateInputValue(task.effectiveFrom),
    effectiveTo: toDateInputValue(task.effectiveTo),
  }
}

function newSlaTaskPolicy(sortOrder: number, escalationRole = ""): SlaTaskForm {
  return {
    stepCode: "",
    taskName: "",
    durationValue: "30",
    durationUnit: "MINUTE",
    warningMode: "ABSOLUTE",
    warningValue: "10",
    warningUnit: "MINUTE",
    escalationRole,
    sortOrder: String(sortOrder),
    status: "ACTIVE",
    effectiveFrom: todayDateInput(),
    effectiveTo: "",
  }
}

function summarizeSlaTasks(items: SlaTaskForm[]) {
  let dueMinutes = 0
  let warningMinutes = 0
  for (const item of items) {
    const duration = toMinutes(Number(item.durationValue) || 0, item.durationUnit)
    dueMinutes += duration
    const warning =
      item.warningMode === "PERCENT"
        ? Math.round(duration * ((Number(item.warningValue) || 0) / 100))
        : toMinutes(Number(item.warningValue) || 0, item.warningUnit)
    if (warning > warningMinutes) warningMinutes = warning
  }
  return {
    dueInHours: Math.max(1, Math.ceil(dueMinutes / 60)),
    warningInHours: Math.max(0, Math.floor(warningMinutes / 60)),
  }
}

function toMinutes(value: number, unit: string) {
  if (unit === "HOUR") return value * 60
  return value
}

function toDateInputValue(value?: string) {
  if (!value) return ""
  return value.slice(0, 10)
}

function fromDateInputValue(value: string) {
  return value ? `${value}T00:00:00Z` : undefined
}

function todayDateInput() {
  return new Date().toISOString().slice(0, 10)
}

function formatDateOnly(value?: string) {
  if (!value) return ""
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(value))
}

function formatAmountRange(min?: number, max?: number) {
  if (min == null && max == null) return "-"
  return `${min ?? 0} - ${max ?? "..."}`
}

function numberOrUndefined(value: string) {
  if (!value) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function routeFromPath(pathname: string): WorkflowRoute {
  if (pathname.startsWith("/workflow/process-configs")) return "process-configs"
  if (pathname.startsWith("/workflow/sla-policies")) return "sla-policies"
  if (pathname.startsWith("/workflow/description-templates")) return "description-templates"
  if (pathname.startsWith("/workflow/roles")) return "roles"
  if (pathname.startsWith("/workflow/monitoring")) return "monitoring"
  return "case-types"
}
