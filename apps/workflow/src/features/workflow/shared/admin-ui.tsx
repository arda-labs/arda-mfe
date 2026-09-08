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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
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
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import { useI18n } from "@workspace/i18n"
import { useEffect, useState } from "react"
import { workflowApi } from "../api"
import { PrincipalPicker } from "../components/principal-picker"
import { notify } from "@workspace/ui/feedback/notify"
import { useProcessInstanceRuntime } from "../shared/use-process-instance-runtime"
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
} from "../api"

export function WorkflowFrame({
  title,
  description,
  metrics,
  action,
  children,
}: {
  title: string
  description: string
  metrics?: {
    label: string
    value: string
    tone: "default" | "success" | "warning" | "error"
  }[]
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
      </div>
      {metrics?.length ? <MetricStrip metrics={metrics} /> : null}
      {children}
    </div>
  )
}

export function CaseTypeTable({
  items,
  mode,
  onEdit,
}: {
  items: WorkflowCaseType[]
  mode: "catalog" | "process"
  onEdit?: (item: WorkflowCaseType) => void
}) {
  const { t } = useI18n()
  if (!items.length) return <EmptyState text={t("workflow.admin.empty_case_types")} />

  return (
    <DataShell>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>{t("workflow.admin.col_case_type")}</TableHead>
            <TableHead>{t("workflow.admin.col_menu")}</TableHead>
            <TableHead>{t("workflow.admin.col_operation_name")}</TableHead>
            <TableHead>
              {mode === "process" ? "BPMN process" : "Service"}
            </TableHead>
            <TableHead>Role</TableHead>
            <TableHead>{t("workflow.admin.col_status")}</TableHead>
            {onEdit ? <TableHead /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.caseType}>
              <TableCell className="font-mono text-xs">
                {item.caseType}
              </TableCell>
              <TableCell>{item.businessArea}</TableCell>
              <TableCell className="font-medium">
                {item.operationName}
              </TableCell>
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
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(item)}
                  >
                    <Edit className="size-4" />
                    {t("workflow.admin.edit")}
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

export function SlaTable({
  items,
  onEdit,
}: {
  items: SlaPolicy[]
  onEdit: (item: SlaPolicy) => void
}) {
  const { t } = useI18n()
  if (!items.length) return <EmptyState text={t("workflow.admin.empty_sla_policies")} />
  return (
    <DataShell>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>{t("workflow.admin.col_sla_code")}</TableHead>
            <TableHead>{t("workflow.admin.col_sla_name")}</TableHead>
            <TableHead>{t("workflow.admin.col_case_type")}</TableHead>
            <TableHead>{t("workflow.admin.col_due")}</TableHead>
            <TableHead>{t("workflow.admin.col_warning")}</TableHead>
            <TableHead>{t("workflow.admin.col_tasks")}</TableHead>
            <TableHead>{t("workflow.admin.col_effective")}</TableHead>
            <TableHead>Escalation</TableHead>
            <TableHead>{t("workflow.admin.col_status")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">{item.code}</TableCell>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{item.caseType}</TableCell>
              <TableCell>{t("workflow.admin.due_hours", { hours: item.dueInHours })}</TableCell>
              <TableCell>{t("workflow.admin.warning_hours", { hours: item.warningInHours })}</TableCell>
              <TableCell>{item.taskPolicies?.length ?? 0}</TableCell>
              <TableCell>{formatDateOnly(item.effectiveFrom) || "-"}</TableCell>
              <TableCell>{item.escalationRole}</TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(item)}
                >
                  <Edit className="size-4" />
                  {t("workflow.admin.edit")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataShell>
  )
}

export function DescriptionTemplateTable({
  items,
  onEdit,
}: {
  items: DescriptionTemplate[]
  onEdit: (item: DescriptionTemplate) => void
}) {
  const { t } = useI18n()
  if (!items.length) return <EmptyState text={t("workflow.admin.empty_description_templates")} />
  return (
    <DataShell>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>{t("workflow.admin.col_code")}</TableHead>
            <TableHead>{t("workflow.admin.col_subsystem")}</TableHead>
            <TableHead>{t("workflow.admin.col_case_type")}</TableHead>
            <TableHead>{t("workflow.admin.col_pattern")}</TableHead>
            <TableHead>{t("workflow.admin.col_preview")}</TableHead>
            <TableHead>{t("workflow.admin.col_status")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">{item.code}</TableCell>
              <TableCell>{subsystemLabel(item.businessSubsystem, t)}</TableCell>
              <TableCell>{item.caseType}</TableCell>
              <TableCell className="max-w-md font-mono text-xs">
                {item.pattern}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.preview}
              </TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(item)}
                >
                  <Edit className="size-4" />
                  {t("workflow.admin.edit")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataShell>
  )
}

export function ProcessRoleTable({
  items,
  onEdit,
}: {
  items: ProcessRole[]
  onEdit: (item: ProcessRole) => void
}) {
  const { t } = useI18n()
  if (!items.length) return <EmptyState text={t("workflow.admin.empty_process_roles")} />
  return (
    <DataShell>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>{t("workflow.admin.col_case_type")}</TableHead>
            <TableHead>{t("workflow.admin.col_step")}</TableHead>
            <TableHead>{t("workflow.admin.col_business_role")}</TableHead>
            <TableHead>IAM role</TableHead>
            <TableHead>{t("workflow.admin.col_action_scope")}</TableHead>
            <TableHead>{t("workflow.admin.col_status")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.caseType}</TableCell>
              <TableCell className="font-mono text-xs">
                {item.stepCode}
              </TableCell>
              <TableCell className="font-medium">{item.businessRole}</TableCell>
              <TableCell>{item.iamRole}</TableCell>
              <TableCell className="text-muted-foreground">
                {item.actionScope}
              </TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(item)}
                >
                  <Edit className="size-4" />
                  {t("workflow.admin.edit")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataShell>
  )
}

export function RoleCatalogTable({
  items,
  onEdit,
}: {
  items: WorkflowRoleCatalog[]
  onEdit: (item: WorkflowRoleCatalog) => void
}) {
  const { t } = useI18n()
  if (!items.length) return <EmptyState text={t("workflow.admin.empty_role_catalog")} />
  return (
    <DataShell>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Role code</TableHead>
            <TableHead>{t("workflow.admin.col_role_name")}</TableHead>
            <TableHead>{t("workflow.admin.col_role_type")}</TableHead>
            <TableHead>{t("workflow.admin.col_subsystem")}</TableHead>
            <TableHead>{t("workflow.admin.col_status")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.roleCode}>
              <TableCell className="font-mono text-xs">
                {item.roleCode}
              </TableCell>
              <TableCell className="font-medium">{item.roleName}</TableCell>
              <TableCell>{item.roleType}</TableCell>
              <TableCell>{subsystemLabel(item.businessSubsystem, t)}</TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(item)}
                >
                  <Edit className="size-4" />
                  {t("workflow.admin.edit")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataShell>
  )
}

export function RoleMembershipTable({
  items,
  onEdit,
}: {
  items: WorkflowRoleMembership[]
  onEdit: (item: WorkflowRoleMembership) => void
}) {
  const { t } = useI18n()
  if (!items.length) return <EmptyState text={t("workflow.admin.empty_role_membership")} />
  return (
    <DataShell>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>{t("workflow.admin.col_role")}</TableHead>
            <TableHead>{t("workflow.admin.col_principal")}</TableHead>
            <TableHead>{t("workflow.admin.col_scope")}</TableHead>
            <TableHead>{t("workflow.admin.col_limits")}</TableHead>
            <TableHead>{t("workflow.admin.col_effective")}</TableHead>
            <TableHead>{t("workflow.admin.col_status")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">
                {item.roleCode}
              </TableCell>
              <TableCell>
                {item.principalType}:{item.principalId}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {[item.orgId, item.branchId, item.productCode]
                  .filter(Boolean)
                  .join(" / ") || t("workflow.admin.scope_all")}
              </TableCell>
              <TableCell>
                {formatAmountRange(item.minAmount, item.maxAmount)}
              </TableCell>
              <TableCell>
                {formatDateOnly(item.effectiveFrom)} -{" "}
                {formatDateOnly(item.effectiveTo) || "..."}
              </TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(item)}
                >
                  <Edit className="size-4" />
                  {t("workflow.admin.edit")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataShell>
  )
}

export function AssignmentRuleTable({
  items,
  onEdit,
}: {
  items: WorkflowAssignmentRule[]
  onEdit: (item: WorkflowAssignmentRule) => void
}) {
  const { t } = useI18n()
  if (!items.length) return <EmptyState text={t("workflow.admin.empty_assignment_rules")} />
  return (
    <DataShell>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>{t("workflow.admin.col_case_type")}</TableHead>
            <TableHead>{t("workflow.admin.col_step")}</TableHead>
            <TableHead>{t("workflow.admin.col_role")}</TableHead>
            <TableHead>{t("workflow.admin.col_mode")}</TableHead>
            <TableHead>{t("workflow.admin.col_maker_checker")}</TableHead>
            <TableHead>{t("workflow.admin.col_fallback")}</TableHead>
            <TableHead>{t("workflow.admin.col_priority")}</TableHead>
            <TableHead>{t("workflow.admin.col_status")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.caseType}</TableCell>
              <TableCell className="font-mono text-xs">
                {item.stepCode}
              </TableCell>
              <TableCell>{item.roleCode}</TableCell>
              <TableCell>{item.assignmentMode}</TableCell>
              <TableCell>
                {item.requireSeparationOfDuties
                  ? t("workflow.admin.sod_required")
                  : t("workflow.admin.sod_optional")}
              </TableCell>
              <TableCell>{item.fallbackRoleCode || "-"}</TableCell>
              <TableCell>{item.priority}</TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(item)}
                >
                  <Edit className="size-4" />
                  {t("workflow.admin.edit")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataShell>
  )
}

export function DelegationTable({
  items,
  onEdit,
}: {
  items: WorkflowDelegation[]
  onEdit: (item: WorkflowDelegation) => void
}) {
  const { t } = useI18n()
  if (!items.length) return <EmptyState text={t("workflow.admin.empty_delegations")} />
  return (
    <DataShell>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>{t("workflow.admin.col_role")}</TableHead>
            <TableHead>{t("workflow.admin.col_from_user")}</TableHead>
            <TableHead>{t("workflow.admin.col_to_user")}</TableHead>
            <TableHead>{t("workflow.admin.col_effective")}</TableHead>
            <TableHead>{t("workflow.admin.col_reason")}</TableHead>
            <TableHead>{t("workflow.admin.col_status")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.roleCode}</TableCell>
              <TableCell>{item.fromPrincipalId}</TableCell>
              <TableCell>{item.toPrincipalId}</TableCell>
              <TableCell>
                {formatDateOnly(item.effectiveFrom)} -{" "}
                {formatDateOnly(item.effectiveTo) || "..."}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.reason || "-"}
              </TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(item)}
                >
                  <Edit className="size-4" />
                  {t("workflow.admin.edit")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataShell>
  )
}

export function ProcessDefinitionsTable({
  items,
  selectedId,
  onSelect,
  onView,
  onUpdate,
  onDeploy,
  onDelete,
  saving,
}: {
  items: WorkflowProcessDefinition[]
  selectedId?: string
  onSelect: (item: WorkflowProcessDefinition) => void
  onView: (item: WorkflowProcessDefinition) => void
  onUpdate: (item: WorkflowProcessDefinition) => void
  onDeploy?: (id: string) => Promise<void>
  onDelete?: (id: string) => void
  saving?: boolean
}) {
  const { t } = useI18n()
  const [deployPending, setDeployPending] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] =
    useState<WorkflowProcessDefinition | null>(null)
  const pending = deployPending != null || saving

  async function handleDeploy(id: string) {
    setDeployPending(id)
    try {
      await onDeploy?.(id)
    } finally {
      setDeployPending(null)
    }
  }

  function confirmDeleteDefinition() {
    if (!deleteTarget || !onDelete) return
    onDelete(deleteTarget.id)
    setDeleteTarget(null)
  }

  if (!items.length)
    return (
      <EmptyState text={t("workflow.admin.empty_process_definitions")} />
    )

  return (
    <>
      <DataShell>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>{t("workflow.admin.col_process_code")}</TableHead>
              <TableHead>BPMN process</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Deploy</TableHead>
              <TableHead>{t("workflow.admin.col_status")}</TableHead>
              <TableHead className="w-[20rem]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                className={item.id === selectedId ? "bg-muted/40" : ""}
              >
                <TableCell>
                  <button
                    type="button"
                    className="text-left font-medium hover:underline"
                    onClick={() => onSelect(item)}
                  >
                    {item.name}
                  </button>
                  <p className="font-mono text-xs text-muted-foreground">
                    {item.processCode}
                  </p>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {item.bpmnProcessId}
                </TableCell>
                <TableCell>v{item.version}</TableCell>
                <TableCell className="font-mono text-xs">
                  {item.deploymentKey ?? t("workflow.admin.not_deployed")}
                </TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => onView(item)}
                    >
                      <Eye className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => downloadDefinition(item)}
                    >
                      <Download className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => onUpdate(item)}
                    >
                      <FileUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      disabled={Boolean(pending)}
                      onClick={() => void handleDeploy(item.id)}
                    >
                      <Rocket className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      disabled={Boolean(pending)}
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
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("workflow.admin.delete_dialog_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("workflow.admin.delete_dialog_description", {
                name: deleteTarget?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(pending)}>
              {t("workflow.admin.delete_cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={Boolean(pending)}
              onClick={confirmDeleteDefinition}
            >
              {t("workflow.admin.delete_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function MonitoringDetail({ item }: { item: WorkflowCase }) {
  const { t } = useI18n()
  const domainHref = workflowDomainHref(item)
  const runtimeQuery = useProcessInstanceRuntime(item.processInstanceKey)
  const runtime = runtimeQuery.data
  const pendingJobs = runtime?.pendingJobs ?? []
  const timeline = runtime?.timeline ?? []

  return (
    <aside className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            {item.caseCode}
          </p>
          <h2 className="text-base font-semibold">{item.title}</h2>
        </div>
        {domainHref ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => navigateTo(domainHref)}
          >
            <Eye className="size-4" />
            {t("workflow.admin.open_crm_case")}
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Field label={t("workflow.admin.field_status")} value={item.status} />
        <Field label={t("workflow.admin.field_db_step")} value={item.currentStep || "-"} />
        <Field
          label={t("workflow.admin.field_assignee")}
          value={item.assignedTo || t("workflow.admin.assignee_unassigned")}
        />
        <Field
          label={t("workflow.admin.field_candidate_role")}
          value={item.candidateRole || "-"}
        />
        <Field
          label={t("workflow.admin.field_process_instance")}
          value={
            item.processInstanceKey ? String(item.processInstanceKey) : "-"
          }
        />
        <Field
          label="Zeebe"
          value={
            runtime?.zeebeStatus ??
            (runtimeQuery.isLoading ? t("workflow.admin.checking") : "-")
          }
        />
      </div>

      {item.processInstanceKey ? (
        <div className="space-y-3 rounded-md border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{t("workflow.admin.runtime_zeebe")}</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => runtimeQuery.refetch()}
              disabled={runtimeQuery.isFetching}
            >
              <RefreshCw className="size-4" />
              {t("workflow.admin.rescan")}
            </Button>
          </div>
          {runtimeQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              {t("workflow.admin.scanning_jobs")}
            </p>
          ) : null}
          {runtimeQuery.error ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>{t("workflow.admin.runtime_error_title")}</AlertTitle>
              <AlertDescription>
                {runtimeQuery.error instanceof Error
                  ? runtimeQuery.error.message
                  : t("workflow.admin.unknown_error")}
              </AlertDescription>
            </Alert>
          ) : null}
          {runtime ? (
            <>
              <Alert>
                <AlertCircle className="size-4" />
                <AlertTitle>{t("workflow.admin.hint_title")}</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>{runtime.hint}</p>
                  <p className="text-xs text-muted-foreground">
                    {runtime.workerNote}
                  </p>
                </AlertDescription>
              </Alert>
              {runtime.activeWorkTask ? (
                <div className="text-sm">
                  <p className="font-medium">{t("workflow.admin.work_task_in_db")}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {runtime.activeWorkTask.stepCode} ·{" "}
                    {runtime.activeWorkTask.taskType ?? "-"} · job{" "}
                    {runtime.activeWorkTask.jobKey ?? t("workflow.admin.job_not_bound")}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("workflow.admin.no_active_work_task")}
                </p>
              )}
              {pendingJobs.length ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t("workflow.admin.pending_jobs_title")}</p>
                  {pendingJobs.map((job) => (
                    <div
                      key={job.jobKey}
                      className="rounded border bg-background px-2 py-1 font-mono text-xs"
                    >
                      {job.jobType} · {job.elementId} · job {job.jobKey}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("workflow.admin.no_pending_jobs", {
                    detail: runtime.pendingJobsError
                      ? ` (${runtime.pendingJobsError})`
                      : "",
                  })}
                </p>
              )}
              {timeline.length ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t("workflow.admin.timeline_title")}</p>
                  <div className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                    {timeline.map((event) => (
                      <p key={event.id}>
                        {formatDateTime(event.createdAt)} · {event.eventType}
                        {event.note ? ` · ${event.note}` : ""}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("workflow.admin.no_process_instance")}
        </p>
      )}
    </aside>
  )
}

export function MonitoringCaseList({
  cases,
  selectedId,
  onSelect,
}: {
  cases: WorkflowCase[]
  selectedId?: string
  onSelect: (item: WorkflowCase) => void
}) {
  const { t } = useI18n()
  if (!cases.length) return <EmptyState text={t("workflow.admin.no_running_instances")} />

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
          <span className="block truncate text-muted-foreground">
            {item.title}
          </span>
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

export function ProcessDefinitionDialog({
  item,
  open,
  onOpenChange,
  onSaved,
}: {
  item?: WorkflowProcessDefinition | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    processCode: item?.processCode ?? "",
    name: item?.name ?? "",
    status: item?.status ?? "DRAFT",
  })
  const [file, setFile] = useState<File | null>(null)
  const pending = saving
  const canSave = Boolean(
    form.name.trim() && file && (item || form.processCode.trim())
  )

  async function save() {
    if (!file || !canSave) return
    setSaving(true)
    try {
      const payload = {
        processCode: form.processCode,
        name: form.name,
        status: form.status,
        file,
      }
      if (item) {
        await workflowApi.updateProcessDefinition(item.id, payload)
      } else {
        await workflowApi.importProcessDefinition(payload)
      }
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      notify.error(
        item
          ? t("workflow.admin.update_bpmn_failed")
          : t("workflow.admin.import_bpmn_failed"),
        error instanceof Error ? error.message : undefined
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {item
              ? t("workflow.admin.dialog_bpmn_update")
              : t("workflow.admin.dialog_bpmn_import")}
          </DialogTitle>
          <DialogDescription>
            {t("workflow.admin.dialog_bpmn_description")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {item ? (
            <Field
              label={t("workflow.admin.field_process_code")}
              value={item.processCode}
            />
          ) : (
            <TextInput
              label={t("workflow.admin.field_process_code")}
              value={form.processCode}
              onChange={(processCode) => setForm({ ...form, processCode })}
            />
          )}
          <TextInput
            label={t("workflow.admin.field_display_name")}
            value={form.name}
            onChange={(name) => setForm({ ...form, name })}
          />
          <SelectInput
            label={t("workflow.admin.field_status_after_import")}
            value={form.status}
            options={configStatusOptions(t)}
            onChange={(status) => setForm({ ...form, status })}
          />
          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("workflow.admin.field_bpmn_file")}</span>
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

export function CaseTypeDialog({
  item,
  open,
  tenantId,
  businessAreaOptions,
  roleOptions,
  onOpenChange,
  onSaved,
}: {
  item?: WorkflowCaseType | null
  tenantId: string
  open: boolean
  businessAreaOptions: SelectOption[]
  roleOptions: SelectOption[]
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
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
    setSaving(true)
    try {
      const payload = {
        tenantId,
        ...form,
        bpmnVersion: Number(form.bpmnVersion) || 1,
      }
      if (item?.caseType) {
        await workflowApi.updateCaseType(item.caseType, payload)
      } else {
        await workflowApi.createCaseType(payload)
      }
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      notify.error(
        item
          ? t("workflow.admin.update_case_type_failed")
          : t("workflow.admin.create_case_type_failed"),
        error instanceof Error ? error.message : undefined
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <ConfigDialog
      title={
        item
          ? t("workflow.admin.dialog_case_type_edit")
          : t("workflow.admin.dialog_case_type_create")
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      <TextInput
        label={t("workflow.admin.field_case_type_code")}
        value={form.caseType}
        onChange={(caseType) => setForm({ ...form, caseType })}
        disabled={Boolean(item)}
      />
      <SelectInput
        label={t("workflow.admin.field_business_area")}
        value={form.businessArea}
        options={businessAreaOptions}
        onChange={(businessArea) => setForm({ ...form, businessArea })}
      />
      <TextInput
        label={t("workflow.admin.field_operation_name")}
        value={form.operationName}
        onChange={(operationName) => setForm({ ...form, operationName })}
      />
      <SelectInput
        label={t("workflow.admin.field_owner_service")}
        value={form.ownerService}
        options={ownerServiceOptions}
        onChange={(ownerService) => setForm({ ...form, ownerService })}
      />
      <TextInput
        label={t("workflow.admin.field_bpmn_process_id")}
        value={form.bpmnProcessId}
        onChange={(bpmnProcessId) => setForm({ ...form, bpmnProcessId })}
      />
      <TextInput
        label={t("workflow.admin.field_bpmn_version")}
        value={form.bpmnVersion}
        onChange={(bpmnVersion) => setForm({ ...form, bpmnVersion })}
      />
      <SearchSelect
        label={t("workflow.admin.field_maker_role")}
        value={form.makerRole}
        options={roleOptions}
        allowCustom
        onChange={(makerRole) => setForm({ ...form, makerRole })}
      />
      <SearchSelect
        label={t("workflow.admin.field_checker_role")}
        value={form.checkerRole}
        options={roleOptions}
        allowCustom
        onChange={(checkerRole) => setForm({ ...form, checkerRole })}
      />
      <SelectInput
        label={t("workflow.admin.field_status")}
        value={form.status}
        options={configStatusOptions(t)}
        onChange={(status) => setForm({ ...form, status })}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.workflowEnabled}
          onChange={(event) =>
            setForm({ ...form, workflowEnabled: event.target.checked })
          }
        />
        {t("workflow.admin.field_workflow_enabled")}
      </label>
      <DialogActions
        onCancel={() => onOpenChange(false)}
        onSave={save}
        pending={saving}
        disabled={!canSave}
      />
    </ConfigDialog>
  )
}

export function ProcessConfigDialog({
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
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
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
    setSaving(true)
    try {
      await workflowApi.updateProcessConfig(item.caseType, {
        ...form,
        bpmnVersion: Number(form.bpmnVersion) || 1,
      })
      onOpenChange(false)
    } catch (error) {
      notify.error(
        t("workflow.admin.update_process_config_failed"),
        error instanceof Error ? error.message : undefined
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("workflow.admin.dialog_process_config_title")}</DialogTitle>
          <DialogDescription>{item?.caseType}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <TextInput
            label={t("workflow.admin.field_bpmn_process_id")}
            value={form.bpmnProcessId}
            onChange={(bpmnProcessId) => setForm({ ...form, bpmnProcessId })}
          />
          <TextInput
            label={t("workflow.admin.field_bpmn_version")}
            value={form.bpmnVersion}
            onChange={(bpmnVersion) => setForm({ ...form, bpmnVersion })}
          />
          <SearchSelect
            label={t("workflow.admin.field_default_sla")}
            value={form.defaultSlaPolicyId}
            options={slaOptions}
            emptyLabel={t("workflow.admin.empty_no_sla")}
            onChange={(defaultSlaPolicyId) =>
              setForm({ ...form, defaultSlaPolicyId })
            }
          />
          <SearchSelect
            label={t("workflow.admin.field_maker_role")}
            value={form.makerRole}
            options={roleOptions}
            allowCustom
            onChange={(makerRole) => setForm({ ...form, makerRole })}
          />
          <SearchSelect
            label={t("workflow.admin.field_checker_role")}
            value={form.checkerRole}
            options={roleOptions}
            allowCustom
            onChange={(checkerRole) => setForm({ ...form, checkerRole })}
          />
          <SelectInput
            label={t("workflow.admin.field_status")}
            value={form.status}
            options={configStatusOptions(t)}
            onChange={(status) => setForm({ ...form, status })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.workflowEnabled}
              onChange={(event) =>
                setForm({ ...form, workflowEnabled: event.target.checked })
              }
            />
            {t("workflow.admin.field_workflow_enabled")}
          </label>
          <DialogActions
            onCancel={() => onOpenChange(false)}
            onSave={save}
            pending={saving}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SlaPolicyDialog({
  item,
  open,
  caseTypeOptions,
  roleOptions,
  onOpenChange,
  onSaved,
}: {
  item?: SlaPolicy | null
  open: boolean
  caseTypeOptions: SelectOption[]
  roleOptions: SelectOption[]
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
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
    taskPolicies: item?.taskPolicies?.length
      ? item.taskPolicies.map(toSlaTaskForm)
      : [newSlaTaskPolicy(10, item?.escalationRole)],
  })
  const canSave =
    form.code &&
    form.name &&
    form.caseType &&
    form.escalationRole &&
    form.taskPolicies.length > 0

  async function save() {
    if (!canSave) return
    setSaving(true)
    try {
      const summary = summarizeSlaTasks(form.taskPolicies)
      const payload = {
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
      }
      if (item?.id) {
        await workflowApi.updateSlaPolicy(item.id, payload)
      } else {
        await workflowApi.createSlaPolicy(payload)
      }
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      notify.error(
        item
          ? t("workflow.admin.update_sla_failed")
          : t("workflow.admin.create_sla_failed"),
        error instanceof Error ? error.message : undefined
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <ConfigDialog
      title={
        item ? t("workflow.admin.dialog_sla_edit") : t("workflow.admin.dialog_sla_create")
      }
      open={open}
      wide
      onOpenChange={onOpenChange}
    >
      <div className="grid gap-3 lg:grid-cols-3">
        <TextInput
          label={t("workflow.admin.col_sla_code")}
          value={form.code}
          onChange={(code) => setForm({ ...form, code })}
        />
        <TextInput
          label={t("workflow.admin.col_sla_name")}
          value={form.name}
          onChange={(name) => setForm({ ...form, name })}
        />
        <SearchSelect
          label={t("workflow.admin.col_case_type")}
          value={form.caseType}
          options={caseTypeOptions}
          onChange={(caseType) => setForm({ ...form, caseType })}
        />
        <SearchSelect
          label={t("workflow.admin.field_escalation_role")}
          value={form.escalationRole}
          options={roleOptions}
          allowCustom
          onChange={(escalationRole) => setForm({ ...form, escalationRole })}
        />
        <DateInput
          label={t("workflow.admin.field_effective_from")}
          value={form.effectiveFrom}
          onChange={(effectiveFrom) => setForm({ ...form, effectiveFrom })}
        />
        <DateInput
          label={t("workflow.admin.field_effective_to")}
          value={form.effectiveTo}
          onChange={(effectiveTo) => setForm({ ...form, effectiveTo })}
        />
        <SelectInput
          label={t("workflow.admin.field_status")}
          value={form.status}
          options={configStatusOptions(t)}
          onChange={(status) => setForm({ ...form, status })}
        />
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
        pending={saving}
        disabled={!canSave}
      />
    </ConfigDialog>
  )
}

type SlaTaskForm = Omit<
  SlaTaskPolicy,
  | "durationValue"
  | "warningValue"
  | "sortOrder"
  | "effectiveFrom"
  | "effectiveTo"
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
  const { t } = useI18n()
  function update(index: number, patch: Partial<SlaTaskForm>) {
    onChange(
      items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{t("workflow.admin.sla_tasks_title")}</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onChange([
              ...items,
              newSlaTaskPolicy((items.length + 1) * 10, defaultEscalationRole),
            ])
          }
        >
          <Plus className="size-4" />
          {t("workflow.admin.sla_task_add")}
        </Button>
      </div>
      <DataShell>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="min-w-36">{t("workflow.admin.sla_col_step_code")}</TableHead>
              <TableHead className="min-w-44">{t("workflow.admin.sla_col_task_name")}</TableHead>
              <TableHead className="min-w-24">{t("workflow.admin.sla_col_duration")}</TableHead>
              <TableHead className="min-w-28">{t("workflow.admin.sla_col_unit")}</TableHead>
              <TableHead className="min-w-28">{t("workflow.admin.sla_col_warning_mode")}</TableHead>
              <TableHead className="min-w-24">{t("workflow.admin.sla_col_warning")}</TableHead>
              <TableHead className="min-w-28">{t("workflow.admin.sla_col_warning_unit")}</TableHead>
              <TableHead className="min-w-44">Escalation</TableHead>
              <TableHead className="min-w-36">{t("workflow.admin.sla_col_effective")}</TableHead>
              <TableHead className="min-w-36">{t("workflow.admin.sla_col_expired")}</TableHead>
              <TableHead className="min-w-28">{t("workflow.admin.col_status")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.id || index}>
                <TableCell>
                  <Input
                    value={item.stepCode}
                    onChange={(event) =>
                      update(index, { stepCode: event.target.value })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={item.taskName}
                    onChange={(event) =>
                      update(index, { taskName: event.target.value })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    value={item.durationValue}
                    onChange={(event) =>
                      update(index, { durationValue: event.target.value })
                    }
                  />
                </TableCell>
                <TableCell>
                  <InlineSelect
                    value={item.durationUnit}
                    options={durationUnitOptions(t)}
                    onChange={(durationUnit) =>
                      update(index, {
                        durationUnit:
                          durationUnit as SlaTaskForm["durationUnit"],
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <InlineSelect
                    value={item.warningMode}
                    options={warningModeOptions(t)}
                    onChange={(warningMode) =>
                      update(index, {
                        warningMode: warningMode as SlaTaskForm["warningMode"],
                        warningUnit:
                          warningMode === "PERCENT"
                            ? "PERCENT"
                            : item.warningUnit === "PERCENT"
                              ? "MINUTE"
                              : item.warningUnit,
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    value={item.warningValue}
                    onChange={(event) =>
                      update(index, { warningValue: event.target.value })
                    }
                  />
                </TableCell>
                <TableCell>
                  <InlineSelect
                    value={item.warningUnit}
                    options={warningUnitOptions(item.warningMode, t)}
                    onChange={(warningUnit) =>
                      update(index, {
                        warningUnit: warningUnit as SlaTaskForm["warningUnit"],
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <SearchSelect
                    value={item.escalationRole}
                    options={roleOptions}
                    allowCustom
                    onChange={(escalationRole) =>
                      update(index, { escalationRole })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={item.effectiveFrom}
                    onChange={(event) =>
                      update(index, { effectiveFrom: event.target.value })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={item.effectiveTo}
                    onChange={(event) =>
                      update(index, { effectiveTo: event.target.value })
                    }
                  />
                </TableCell>
                <TableCell>
                  <InlineSelect
                    value={item.status}
                    options={configStatusOptions(t)}
                    onChange={(status) => update(index, { status })}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={items.length === 1}
                    onClick={() =>
                      onChange(items.filter((_, i) => i !== index))
                    }
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

export function DescriptionTemplateDialog({
  item,
  open,
  caseTypeOptions,
  subsystemOptions,
  onOpenChange,
  onSaved,
}: {
  item?: DescriptionTemplate | null
  open: boolean
  caseTypeOptions: SelectOption[]
  subsystemOptions: SelectOption[]
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: item?.code ?? "",
    businessSubsystem: item?.businessSubsystem ?? "FAC",
    caseType: item?.caseType ?? "",
    pattern: item?.pattern ?? "",
    status: item?.status ?? "ACTIVE",
  })
  const tokens = templateTokens(form.businessSubsystem, t)
  const preview = renderDescriptionPreview(form.pattern, t)
  const canSave =
    form.code && form.businessSubsystem && form.caseType && form.pattern

  function insertToken(token: string) {
    const next = form.pattern ? `${form.pattern} {${token}}` : `{${token}}`
    setForm({ ...form, pattern: next })
  }

  async function save() {
    if (!canSave) return
    setSaving(true)
    try {
      const payload = { ...form, preview }
      if (item?.id) {
        await workflowApi.updateDescriptionTemplate(item.id, payload)
      } else {
        await workflowApi.createDescriptionTemplate(payload)
      }
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      notify.error(
        item
          ? t("workflow.admin.update_template_failed")
          : t("workflow.admin.create_template_failed"),
        error instanceof Error ? error.message : undefined
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <ConfigDialog
      title={
        item
          ? t("workflow.admin.dialog_template_edit")
          : t("workflow.admin.dialog_template_create")
      }
      open={open}
      wide
      onOpenChange={onOpenChange}
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <TextInput
          label={t("workflow.admin.field_template_code")}
          value={form.code}
          onChange={(code) => setForm({ ...form, code })}
        />
        <SelectInput
          label={t("workflow.admin.field_business_subsystem")}
          value={form.businessSubsystem}
          options={subsystemOptions}
          onChange={(businessSubsystem) =>
            setForm({ ...form, businessSubsystem })
          }
        />
        <SearchSelect
          label={t("workflow.admin.col_case_type")}
          value={form.caseType}
          options={caseTypeOptions}
          onChange={(caseType) => setForm({ ...form, caseType })}
        />
        <SelectInput
          label={t("workflow.admin.field_status")}
          value={form.status}
          options={configStatusOptions(t)}
          onChange={(status) => setForm({ ...form, status })}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("workflow.admin.field_pattern")}</span>
          <Textarea
            className="min-h-32 font-mono"
            value={form.pattern}
            onChange={(event) =>
              setForm({ ...form, pattern: event.target.value })
            }
          />
        </label>
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("workflow.admin.insert_token")}</p>
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
        <p className="text-xs font-medium text-muted-foreground">
          {t("workflow.admin.col_preview")}
        </p>
        <p className="mt-1 text-sm break-words">
          {preview || t("workflow.admin.template_preview_empty")}
        </p>
      </div>

      <DialogActions
        onCancel={() => onOpenChange(false)}
        onSave={save}
        pending={saving}
        disabled={!canSave}
      />
    </ConfigDialog>
  )
}

export function ProcessRoleDialog({
  item,
  open,
  caseTypeOptions,
  iamRoleOptions,
  onOpenChange,
  onSaved,
}: {
  item?: ProcessRole | null
  open: boolean
  caseTypeOptions: SelectOption[]
  iamRoleOptions: SelectOption[]
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    caseType: item?.caseType ?? "",
    stepCode: item?.stepCode ?? "",
    businessRole: item?.businessRole ?? "",
    iamRole: item?.iamRole ?? "",
    actionScope: item?.actionScope ?? "",
    status: item?.status ?? "ACTIVE",
  })

  async function save() {
    setSaving(true)
    try {
      if (item?.id) {
        await workflowApi.updateProcessRole(item.id, form)
      } else {
        await workflowApi.createProcessRole(form)
      }
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      notify.error(
        item
          ? t("workflow.admin.update_process_role_failed")
          : t("workflow.admin.create_process_role_failed"),
        error instanceof Error ? error.message : undefined
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <ConfigDialog
      title={
        item
          ? t("workflow.admin.dialog_process_role_edit")
          : t("workflow.admin.dialog_process_role_create")
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      <SearchSelect
        label={t("workflow.admin.col_case_type")}
        value={form.caseType}
        options={caseTypeOptions}
        onChange={(caseType) => setForm({ ...form, caseType })}
      />
      <TextInput
        label={t("workflow.admin.field_process_step")}
        value={form.stepCode}
        onChange={(stepCode) => setForm({ ...form, stepCode })}
      />
      <TextInput
        label={t("workflow.admin.field_business_role")}
        value={form.businessRole}
        onChange={(businessRole) => setForm({ ...form, businessRole })}
      />
      <SearchSelect
        label={t("workflow.admin.col_iam_role")}
        value={form.iamRole}
        options={iamRoleOptions}
        allowCustom
        onChange={(iamRole) => setForm({ ...form, iamRole })}
      />
      <SelectInput
        label={t("workflow.admin.col_action_scope")}
        value={form.actionScope}
        options={actionScopeOptions(t)}
        onChange={(actionScope) => setForm({ ...form, actionScope })}
      />
      <SelectInput
        label={t("workflow.admin.field_status")}
        value={form.status}
        options={configStatusOptions(t)}
        onChange={(status) => setForm({ ...form, status })}
      />
      <DialogActions
        onCancel={() => onOpenChange(false)}
        onSave={save}
        pending={saving}
      />
    </ConfigDialog>
  )
}

export function RoleCatalogDialog({
  item,
  open,
  onOpenChange,
  onSaved,
}: {
  item?: WorkflowRoleCatalog | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    roleCode: item?.roleCode ?? "",
    roleName: item?.roleName ?? "",
    roleType: item?.roleType ?? "MAKER",
    businessSubsystem: item?.businessSubsystem ?? "FAC",
    status: item?.status ?? "ACTIVE",
  })
  const canSave =
    form.roleCode && form.roleName && form.roleType && form.businessSubsystem

  async function save() {
    if (!canSave) return
    setSaving(true)
    try {
      if (item?.roleCode) {
        await workflowApi.updateRoleCatalog(item.roleCode, form)
      } else {
        await workflowApi.createRoleCatalog(form)
      }
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      notify.error(
        item
          ? t("workflow.admin.update_role_catalog_failed")
          : t("workflow.admin.create_role_catalog_failed"),
        error instanceof Error ? error.message : undefined
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <ConfigDialog
      title={
        item
          ? t("workflow.admin.dialog_role_catalog_edit")
          : t("workflow.admin.dialog_role_catalog_create")
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      <TextInput
        label={t("workflow.admin.field_role_code")}
        value={form.roleCode}
        disabled={Boolean(item)}
        onChange={(roleCode) => setForm({ ...form, roleCode })}
      />
      <TextInput
        label={t("workflow.admin.field_role_name")}
        value={form.roleName}
        onChange={(roleName) => setForm({ ...form, roleName })}
      />
      <SelectInput
        label={t("workflow.admin.field_role_type")}
        value={form.roleType}
        options={roleTypeOptions(t)}
        onChange={(roleType) => setForm({ ...form, roleType })}
      />
      <SelectInput
        label={t("workflow.admin.col_subsystem")}
        value={form.businessSubsystem}
        options={businessSubsystemOptions(t)}
        onChange={(businessSubsystem) =>
          setForm({ ...form, businessSubsystem })
        }
      />
      <SelectInput
        label={t("workflow.admin.field_status")}
        value={form.status}
        options={configStatusOptions(t)}
        onChange={(status) => setForm({ ...form, status })}
      />
      <DialogActions
        onCancel={() => onOpenChange(false)}
        onSave={save}
        pending={saving}
        disabled={!canSave}
      />
    </ConfigDialog>
  )
}

export function RoleMembershipDialog({
  item,
  open,
  roleOptions,
  onOpenChange,
  onSaved,
}: {
  item?: WorkflowRoleMembership | null
  open: boolean
  roleOptions: SelectOption[]
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
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

  useEffect(() => {
    if (!open) return
    setForm({
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
  }, [item, open])

  const canSave = form.roleCode && form.principalType && form.principalId

  async function save() {
    if (!canSave) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        minAmount: numberOrUndefined(form.minAmount),
        maxAmount: numberOrUndefined(form.maxAmount),
        effectiveFrom: fromDateInputValue(form.effectiveFrom),
        effectiveTo: fromDateInputValue(form.effectiveTo),
      }
      if (item?.id) {
        await workflowApi.updateRoleMembership(payload.tenantId, item.id, payload)
      } else {
        await workflowApi.createRoleMembership(payload.tenantId, payload)
      }
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      notify.error(
        item
          ? t("workflow.admin.update_role_membership_failed")
          : t("workflow.admin.add_role_membership_failed"),
        error instanceof Error ? error.message : undefined
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <ConfigDialog
      title={
        item
          ? t("workflow.admin.dialog_role_membership_edit")
          : t("workflow.admin.dialog_role_membership_add")
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      <SearchSelect
        label={t("workflow.admin.col_role")}
        value={form.roleCode}
        options={roleOptions}
        onChange={(roleCode) => setForm({ ...form, roleCode })}
      />
      <SelectInput
        label={t("workflow.admin.field_principal_type")}
        value={form.principalType}
        options={principalTypeOptions}
        onChange={(principalType) =>
          setForm({ ...form, principalType, principalId: "" })
        }
      />
      <PrincipalPicker
        label={
          form.principalType === "USER"
            ? t("workflow.admin.field_user")
            : t("workflow.admin.field_group")
        }
        principalType={form.principalType === "GROUP" ? "GROUP" : "USER"}
        value={form.principalId}
        onChange={(principalId) => setForm({ ...form, principalId })}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <TextInput
          label="Tenant"
          value={form.tenantId}
          onChange={(tenantId) => setForm({ ...form, tenantId })}
        />
        <TextInput
          label={t("workflow.admin.field_org_unit")}
          value={form.orgId}
          onChange={(orgId) => setForm({ ...form, orgId })}
        />
        <TextInput
          label={t("workflow.admin.field_branch")}
          value={form.branchId}
          onChange={(branchId) => setForm({ ...form, branchId })}
        />
        <TextInput
          label={t("workflow.admin.field_product")}
          value={form.productCode}
          onChange={(productCode) => setForm({ ...form, productCode })}
        />
        <TextInput
          label={t("workflow.admin.field_min_amount")}
          value={form.minAmount}
          onChange={(minAmount) => setForm({ ...form, minAmount })}
        />
        <TextInput
          label={t("workflow.admin.field_max_amount")}
          value={form.maxAmount}
          onChange={(maxAmount) => setForm({ ...form, maxAmount })}
        />
        <DateInput
          label={t("workflow.admin.field_effective_from")}
          value={form.effectiveFrom}
          onChange={(effectiveFrom) => setForm({ ...form, effectiveFrom })}
        />
        <DateInput
          label={t("workflow.admin.field_effective_to")}
          value={form.effectiveTo}
          onChange={(effectiveTo) => setForm({ ...form, effectiveTo })}
        />
      </div>
      <SelectInput
        label={t("workflow.admin.field_status")}
        value={form.status}
        options={configStatusOptions(t)}
        onChange={(status) => setForm({ ...form, status })}
      />
      <DialogActions
        onCancel={() => onOpenChange(false)}
        onSave={save}
        pending={saving}
        disabled={!canSave}
      />
    </ConfigDialog>
  )
}

export function AssignmentRuleDialog({
  item,
  open,
  caseTypeOptions,
  roleOptions,
  onOpenChange,
  onSaved,
}: {
  item?: WorkflowAssignmentRule | null
  open: boolean
  caseTypeOptions: SelectOption[]
  roleOptions: SelectOption[]
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
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
  const canSave =
    form.caseType && form.stepCode && form.roleCode && form.assignmentMode

  async function save() {
    if (!canSave) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        priority: Number(form.priority) || 100,
      }
      if (item?.id) {
        await workflowApi.updateAssignmentRule(item.id, payload)
      } else {
        await workflowApi.createAssignmentRule(payload)
      }
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      notify.error(
        item
          ? t("workflow.admin.update_assignment_failed")
          : t("workflow.admin.create_assignment_failed"),
        error instanceof Error ? error.message : undefined
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <ConfigDialog
      title={
        item
          ? t("workflow.admin.dialog_assignment_edit")
          : t("workflow.admin.dialog_assignment_create")
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      <SearchSelect
        label={t("workflow.admin.col_case_type")}
        value={form.caseType}
        options={caseTypeOptions}
        onChange={(caseType) => setForm({ ...form, caseType })}
      />
      <TextInput
        label={t("workflow.admin.field_process_step")}
        value={form.stepCode}
        onChange={(stepCode) => setForm({ ...form, stepCode })}
      />
      <SearchSelect
        label={t("workflow.admin.field_process_role")}
        value={form.roleCode}
        options={roleOptions}
        onChange={(roleCode) => setForm({ ...form, roleCode })}
      />
      <SelectInput
        label={t("workflow.admin.field_assignment_mode")}
        value={form.assignmentMode}
        options={assignmentModeOptions(t)}
        onChange={(assignmentMode) => setForm({ ...form, assignmentMode })}
      />
      <SearchSelect
        label={t("workflow.admin.col_fallback")}
        value={form.fallbackRoleCode}
        options={roleOptions}
        emptyLabel={t("workflow.admin.empty_none")}
        onChange={(fallbackRoleCode) => setForm({ ...form, fallbackRoleCode })}
      />
      <TextInput
        label={t("workflow.admin.field_priority")}
        value={form.priority}
        onChange={(priority) => setForm({ ...form, priority })}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.requireSeparationOfDuties}
          onChange={(event) =>
            setForm({
              ...form,
              requireSeparationOfDuties: event.target.checked,
            })
          }
        />
        {t("workflow.admin.field_sod")}
      </label>
      <SelectInput
        label={t("workflow.admin.field_status")}
        value={form.status}
        options={configStatusOptions(t)}
        onChange={(status) => setForm({ ...form, status })}
      />
      <DialogActions
        onCancel={() => onOpenChange(false)}
        onSave={save}
        pending={saving}
        disabled={!canSave}
      />
    </ConfigDialog>
  )
}

export function DelegationDialog({
  item,
  open,
  tenantId,
  roleOptions,
  onOpenChange,
  onSaved,
}: {
  item?: WorkflowDelegation | null
  tenantId: string
  open: boolean
  roleOptions: SelectOption[]
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
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
    setSaving(true)
    try {
      const payload = {
        ...form,
        tenantId,
        effectiveFrom: fromDateInputValue(form.effectiveFrom),
        effectiveTo: fromDateInputValue(form.effectiveTo),
      }
      if (item?.id) {
        await workflowApi.updateDelegation(tenantId, item.id, payload)
      } else {
        await workflowApi.createDelegation(tenantId, payload)
      }
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      notify.error(
        item
          ? t("workflow.admin.update_delegation_failed")
          : t("workflow.admin.create_delegation_failed"),
        error instanceof Error ? error.message : undefined
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <ConfigDialog
      title={
        item
          ? t("workflow.admin.dialog_delegation_edit")
          : t("workflow.admin.dialog_delegation_create")
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      <SearchSelect
        label={t("workflow.admin.field_delegation_role")}
        value={form.roleCode}
        options={roleOptions}
        onChange={(roleCode) => setForm({ ...form, roleCode })}
      />
      <TextInput
        label={t("workflow.admin.field_from_user")}
        value={form.fromPrincipalId}
        onChange={(fromPrincipalId) => setForm({ ...form, fromPrincipalId })}
      />
      <TextInput
        label={t("workflow.admin.field_to_user")}
        value={form.toPrincipalId}
        onChange={(toPrincipalId) => setForm({ ...form, toPrincipalId })}
      />
      <DateInput
        label={t("workflow.admin.field_effective_from")}
        value={form.effectiveFrom}
        onChange={(effectiveFrom) => setForm({ ...form, effectiveFrom })}
      />
      <DateInput
        label={t("workflow.admin.field_effective_to")}
        value={form.effectiveTo}
        onChange={(effectiveTo) => setForm({ ...form, effectiveTo })}
      />
      <label className="grid gap-1 text-sm">
        <span className="font-medium">{t("workflow.admin.field_reason")}</span>
        <Textarea
          value={form.reason}
          onChange={(event) => setForm({ ...form, reason: event.target.value })}
        />
      </label>
      <SelectInput
        label={t("workflow.admin.field_status")}
        value={form.status}
        options={configStatusOptions(t)}
        onChange={(status) => setForm({ ...form, status })}
      />
      <DialogActions
        onCancel={() => onOpenChange(false)}
        onSave={save}
        pending={saving}
        disabled={!canSave}
      />
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
  const { t } = useI18n()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(wide && "max-w-[min(96vw,1200px)]")}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {t("workflow.admin.config_dialog_description")}
          </DialogDescription>
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
      <Input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
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
  const { t } = useI18n()
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={t("workflow.admin.select_value_placeholder")} />
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
  const { t } = useI18n()
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={t("workflow.admin.select_placeholder")} />
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
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const selected = options.find((option) => option.value === value)
  const customValue = search.trim()
  const canUseCustom =
    allowCustom &&
    customValue &&
    !options.some(
      (option) => option.value.toLowerCase() === customValue.toLowerCase()
    )

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
              {selected?.label || value || emptyLabel || t("workflow.admin.select_value_placeholder")}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder={t("workflow.admin.search_by_code_or_name")}
            />
            <CommandList>
              <CommandEmpty>{t("workflow.admin.search_empty")}</CommandEmpty>
              <CommandGroup>
                {emptyLabel ? (
                  <CommandItem
                    value="__empty__"
                    onSelect={() => {
                      onChange("")
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "size-4",
                        value === "" ? "opacity-100" : "opacity-0"
                      )}
                    />
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
                    <Check
                      className={cn(
                        "size-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
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
                    {t("workflow.admin.use_custom_value", { value: customValue })}
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
  const { t } = useI18n()
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        {t("workflow.admin.close")}
      </Button>
      <Button type="button" onClick={onSave} disabled={pending || disabled}>
        {pending ? t("workflow.admin.saving") : t("workflow.admin.save")}
      </Button>
    </div>
  )
}

function MetricStrip({
  metrics,
}: {
  metrics: {
    label: string
    value: string
    tone: "default" | "success" | "warning" | "error"
  }[]
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {metrics.map((item) => (
        <div key={item.label} className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className={cn("text-2xl font-semibold", metricTone(item.tone))}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}

export function LoadingBlock() {
  return (
    <div className="flex justify-center rounded-lg border p-8">
      <Spinner className="size-6" />
    </div>
  )
}

function DataShell({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-lg border">{children}</div>
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border p-3 text-sm text-muted-foreground">
      {text}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground/70">{label}</p>
      <p className="font-medium break-words text-foreground">{value}</p>
    </div>
  )
}

function workflowDomainHref(item: WorkflowCase) {
  if (item.caseType !== "CUSTOMER_REGISTRATION" || !item.primaryObjectId)
    return ""
  const search = new URLSearchParams({
    customerId: item.primaryObjectId,
    caseId: item.id,
    caseCode: item.caseCode,
  })
  return `/customers/registrations?${search.toString()}`
}

function navigateTo(path: string) {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "ACTIVE" || status === "COMPLETED" ? "secondary" : "outline"
  return <Badge variant={variant}>{status}</Badge>
}

async function downloadDefinition(item: WorkflowProcessDefinition) {
  const xml =
    item.xmlContent || (await workflowApi.getProcessDefinitionXml(item.id))
  downloadText(
    xml,
    item.resourceName || `${item.bpmnProcessId}.bpmn`,
    "application/xml"
  )
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

export type TFn = ReturnType<typeof useI18n>["t"]

export function monitoringMetrics(cases: WorkflowCase[], t: TFn) {
  const running = cases.filter(
    (item) => !["COMPLETED", "CANCELLED"].includes(item.status)
  ).length
  const incidents = cases.filter((item) =>
    ["FAILED", "SUSPENDED"].includes(item.status)
  ).length
  const overdue = cases.filter(
    (item) => item.slaDueAt && new Date(item.slaDueAt).getTime() < Date.now()
  ).length

  return [
    { label: t("workflow.admin.metric_running"), value: String(running), tone: "default" as const },
    {
      label: t("workflow.admin.metric_sla_overdue"),
      value: String(overdue),
      tone: overdue ? ("warning" as const) : ("success" as const),
    },
    {
      label: "Incident",
      value: String(incidents),
      tone: incidents ? ("error" as const) : ("success" as const),
    },
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

const configStatusOptions = (t: TFn): SelectOption[] => [
  { value: "DRAFT", label: t("workflow.status.draft") },
  { value: "ACTIVE", label: t("workflow.status.active") },
  { value: "INACTIVE", label: t("workflow.status.inactive") },
]

export const defaultBusinessAreaOptions = (t: TFn): SelectOption[] => [
  { value: "CUSTOMER", label: t("workflow.admin.area_customer") },
  { value: "FINANCE", label: t("workflow.admin.area_finance") },
  { value: "WORKFLOW", label: t("workflow.admin.area_workflow") },
]

const ownerServiceOptions: SelectOption[] = [
  { value: "crm-service", label: "crm-service" },
  { value: "finance-service", label: "finance-service" },
  { value: "workflow-service", label: "workflow-service" },
]

const actionScopeOptions = (t: TFn): SelectOption[] => [
  { value: "claim,save,submit", label: t("workflow.admin.scope_claim_save_submit") },
  { value: "approve,reject,suspend", label: t("workflow.admin.scope_approve_reject_suspend") },
  { value: "review,request_supplement", label: t("workflow.admin.scope_review_request_supplement") },
  { value: "monitor,reassign,retry", label: t("workflow.admin.scope_monitor_reassign_retry") },
]

const roleTypeOptions = (t: TFn): SelectOption[] => [
  { value: "MAKER", label: "Maker" },
  { value: "CHECKER", label: "Checker" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "OPS_ADMIN", label: "Operations admin" },
  { value: "CUSTOM", label: t("workflow.admin.role_type_custom") },
]

const principalTypeOptions: SelectOption[] = [
  { value: "USER", label: "User" },
  { value: "GROUP", label: "Group" },
]

const assignmentModeOptions = (t: TFn): SelectOption[] => [
  { value: "CANDIDATE_POOL", label: "Candidate pool" },
  { value: "AUTO_ASSIGN", label: t("workflow.admin.mode_auto_assign") },
  { value: "ROUND_ROBIN", label: t("workflow.admin.mode_round_robin") },
  { value: "SUPERVISOR_QUEUE", label: t("workflow.admin.mode_supervisor_queue") },
]

export const businessSubsystemOptions = (t: TFn): SelectOption[] => [
  { value: "LNM", label: t("workflow.admin.subsystem_lnm") },
  { value: "DPM", label: t("workflow.admin.subsystem_dpm") },
  { value: "FAC", label: t("workflow.admin.subsystem_fac") },
  { value: "IBM", label: t("workflow.admin.subsystem_ibm") },
  { value: "CRM", label: t("workflow.admin.subsystem_crm") },
  { value: "HRM", label: t("workflow.admin.subsystem_hrm") },
  { value: "CFM", label: t("workflow.admin.subsystem_cfm") },
]

const durationUnitOptions = (t: TFn): SelectOption[] => [
  { value: "MINUTE", label: t("workflow.admin.unit_minute") },
  { value: "HOUR", label: t("workflow.admin.unit_hour") },
]

const warningModeOptions = (t: TFn): SelectOption[] => [
  { value: "ABSOLUTE", label: t("workflow.admin.warning_mode_absolute") },
  { value: "PERCENT", label: t("workflow.admin.warning_mode_percent") },
]

function warningUnitOptions(mode: string, t: TFn): SelectOption[] {
  if (mode === "PERCENT") return [{ value: "PERCENT", label: "%" }]
  return durationUnitOptions(t)
}

export function caseTypeOptionsFromCaseTypes(
  items: WorkflowCaseType[]
): SelectOption[] {
  if (!Array.isArray(items)) return []
  return items.map((item) => ({
    value: item.caseType,
    label: `${item.caseType} - ${item.operationName}`,
    description: item.businessArea,
  }))
}

export function roleOptionsFromCaseTypes(
  items: WorkflowCaseType[]
): SelectOption[] {
  if (!Array.isArray(items)) return []
  return uniqueOptions(
    items.flatMap((item) => [item.makerRole, item.checkerRole]),
    []
  )
}

export function uniqueOptions(values: string[], presets: SelectOption[]) {
  const safePresets = Array.isArray(presets) ? presets : []
  const safeValues = Array.isArray(values) ? values : []
  const seen = new Set(safePresets.map((item) => item.value))
  const out = [...safePresets]
  for (const value of safeValues) {
    if (!value || seen.has(value)) continue
    seen.add(value)
    out.push({ value, label: value })
  }
  return out
}

function subsystemLabel(value: string, t: TFn) {
  return (
    businessSubsystemOptions(t).find((item) => item.value === value)?.label ??
    value
  )
}

function templateTokens(subsystem: string, t: TFn): SelectOption[] {
  const common = [
    { value: "caseCode", label: t("workflow.admin.token_case_code") },
    { value: "caseTitle", label: t("workflow.admin.token_case_title") },
    { value: "operationName", label: t("workflow.admin.token_operation_name") },
    { value: "currentStep", label: t("workflow.admin.token_current_step") },
    { value: "createdDate", label: t("workflow.admin.token_created_date") },
  ]
  const bySubsystem: Record<string, SelectOption[]> = {
    FAC: [
      { value: "amount", label: t("workflow.admin.token_amount") },
      { value: "currency", label: t("workflow.admin.token_currency") },
      { value: "counterpartyName", label: t("workflow.admin.token_counterparty_name") },
      { value: "debitAccount", label: t("workflow.admin.token_debit_account") },
      { value: "creditAccount", label: t("workflow.admin.token_credit_account") },
    ],
    CRM: [
      { value: "customerName", label: t("workflow.admin.token_customer_name") },
      { value: "customerNo", label: t("workflow.admin.token_customer_no") },
      { value: "identityNo", label: t("workflow.admin.token_identity_no") },
      { value: "riskLevel", label: t("workflow.admin.token_risk_level") },
    ],
    LNM: [
      { value: "loanAccount", label: t("workflow.admin.token_loan_account") },
      { value: "loanProduct", label: t("workflow.admin.token_loan_product") },
      { value: "principalAmount", label: t("workflow.admin.token_principal_amount") },
    ],
    DPM: [
      { value: "depositAccount", label: t("workflow.admin.token_deposit_account") },
      { value: "depositProduct", label: t("workflow.admin.token_deposit_product") },
      { value: "term", label: t("workflow.admin.token_term") },
    ],
    IBM: [
      { value: "bankName", label: t("workflow.admin.token_bank_name") },
      { value: "nostroAccount", label: t("workflow.admin.token_nostro_account") },
      { value: "settlementDate", label: t("workflow.admin.token_settlement_date") },
    ],
    HRM: [
      { value: "employeeCode", label: t("workflow.admin.token_employee_code") },
      { value: "employeeName", label: t("workflow.admin.token_employee_name") },
      { value: "departmentName", label: t("workflow.admin.token_department_name") },
    ],
    CFM: [
      { value: "fundingSource", label: t("workflow.admin.token_funding_source") },
      { value: "dealCode", label: t("workflow.admin.token_deal_code") },
      { value: "maturityDate", label: t("workflow.admin.token_maturity_date") },
    ],
  }
  return [...common, ...(bySubsystem[subsystem] ?? [])]
}

function renderDescriptionPreview(pattern: string, t: TFn) {
  const sample: Record<string, string> = {
    amount: "125.000.000",
    bankName: "BIDV",
    caseCode: "FAC-20260702-001",
    caseTitle: t("workflow.admin.sample_case_title"),
    counterpartyName: t("workflow.admin.sample_counterparty_name"),
    createdDate: "02/07/2026",
    creditAccount: "421101001",
    currency: "VND",
    currentStep: t("workflow.admin.sample_current_step"),
    customerName: t("workflow.admin.sample_customer_name"),
    customerNo: "CUS000912",
    debitAccount: "101101001",
    dealCode: "CFM-00042",
    departmentName: t("workflow.admin.sample_department_name"),
    depositAccount: "DPM000012",
    depositProduct: t("workflow.admin.sample_deposit_product"),
    employeeCode: "E00128",
    employeeName: t("workflow.admin.sample_employee_name"),
    fundingSource: t("workflow.admin.sample_funding_source"),
    identityNo: "012345678901",
    loanAccount: "LNM000088",
    loanProduct: t("workflow.admin.sample_loan_product"),
    maturityDate: "31/12/2026",
    nostroAccount: "IBM-NOSTRO-01",
    operationName: t("workflow.admin.sample_operation_name"),
    principalAmount: "2.500.000.000",
    riskLevel: t("workflow.admin.sample_risk_level"),
    settlementDate: "02/07/2026",
    term: t("workflow.admin.sample_term"),
  }
  return pattern.replace(
    /\{([a-zA-Z0-9_]+)\}/g,
    (_, key: string) => sample[key] ?? `{${key}}`
  )
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
    const duration = toMinutes(
      Number(item.durationValue) || 0,
      item.durationUnit
    )
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
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(
    new Date(value)
  )
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
