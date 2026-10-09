import {
  AlertCircle,
  Check,
  ChevronsUpDown,
  Download,
  Edit,
  Eye,
  FileUp,
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
import { APP_TIMEZONE, dateInputValue, formatDateTime, todayISO } from "@workspace/format"
import { StatusBadge as SharedStatusBadge } from "@workspace/ui/components/status-badge"
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
import { cn } from "@workspace/ui/lib/utils"
import { useI18n } from "@workspace/i18n"
import { useState } from "react"
import { definitionsApi } from "../api"
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

export type SlaTaskForm = Omit<
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
                <SharedStatusBadge status={item.status} />
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
                <SharedStatusBadge status={item.status} />
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
                <SharedStatusBadge status={item.status} />
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
                <SharedStatusBadge status={item.status} />
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
                <SharedStatusBadge status={item.status} />
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
                <SharedStatusBadge status={item.status} />
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
                <SharedStatusBadge status={item.status} />
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
                <SharedStatusBadge status={item.status} />
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
                  <SharedStatusBadge status={item.status} />
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
            <SharedStatusBadge status={item.status} />
            <span className="truncate font-mono text-xs text-muted-foreground">
              {item.currentStep || "-"}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}

export function ConfigDialog({
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

export function TextInput({
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

export function DateInput({
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

export type SelectOption = {
  value: string
  label: string
  description?: string
}

export function SelectInput({
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

export function InlineSelect({
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

export function SearchSelect({
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

export function DialogActions({
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

export function MetricStrip({
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

export function DataShell({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-lg border">{children}</div>
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border p-3 text-sm text-muted-foreground">
      {text}
    </div>
  )
}

export function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground/70">{label}</p>
      <p className="font-medium break-words text-foreground">{value}</p>
    </div>
  )
}

export function workflowDomainHref(item: WorkflowCase) {
  if (item.caseType !== "CUSTOMER_REGISTRATION" || !item.primaryObjectId)
    return ""
  const search = new URLSearchParams({
    customerId: item.primaryObjectId,
    caseId: item.id,
    caseCode: item.caseCode,
  })
  return `/customers/registrations?${search.toString()}`
}

export function navigateTo(path: string) {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

async function downloadDefinition(item: WorkflowProcessDefinition) {
  const xml =
    item.xmlContent || (await definitionsApi.getProcessDefinitionXml(item.id))
  downloadText(
    xml,
    item.resourceName || `${item.bpmnProcessId}.bpmn`,
    "application/xml"
  )
}

export function downloadText(content: string, filename: string, type: string) {
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

export function metricTone(tone: "default" | "success" | "warning" | "error") {
  if (tone === "success") return "text-emerald-600"
  if (tone === "warning") return "text-amber-600"
  if (tone === "error") return "text-destructive"
  return ""
}

export const configStatusOptions = (t: TFn): SelectOption[] => [
  { value: "DRAFT", label: t("workflow.status.draft") },
  { value: "ACTIVE", label: t("workflow.status.active") },
  { value: "INACTIVE", label: t("workflow.status.inactive") },
]

export const defaultBusinessAreaOptions = (t: TFn): SelectOption[] => [
  { value: "CUSTOMER", label: t("workflow.admin.area_customer") },
  { value: "FINANCE", label: t("workflow.admin.area_finance") },
  { value: "WORKFLOW", label: t("workflow.admin.area_workflow") },
]

export const ownerServiceOptions: SelectOption[] = [
  { value: "crm-service", label: "crm-service" },
  { value: "finance-service", label: "finance-service" },
  { value: "workflow-service", label: "workflow-service" },
]

export const actionScopeOptions = (t: TFn): SelectOption[] => [
  { value: "claim,save,submit", label: t("workflow.admin.scope_claim_save_submit") },
  { value: "approve,reject,suspend", label: t("workflow.admin.scope_approve_reject_suspend") },
  { value: "review,request_supplement", label: t("workflow.admin.scope_review_request_supplement") },
  { value: "monitor,reassign,retry", label: t("workflow.admin.scope_monitor_reassign_retry") },
]

export const roleTypeOptions = (t: TFn): SelectOption[] => [
  { value: "MAKER", label: "Maker" },
  { value: "CHECKER", label: "Checker" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "OPS_ADMIN", label: "Operations admin" },
  { value: "CUSTOM", label: t("workflow.admin.role_type_custom") },
]

export const principalTypeOptions: SelectOption[] = [
  { value: "USER", label: "User" },
  { value: "GROUP", label: "Group" },
]

export const assignmentModeOptions = (t: TFn): SelectOption[] => [
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

export const durationUnitOptions = (t: TFn): SelectOption[] => [
  { value: "MINUTE", label: t("workflow.admin.unit_minute") },
  { value: "HOUR", label: t("workflow.admin.unit_hour") },
]

export const warningModeOptions = (t: TFn): SelectOption[] => [
  { value: "ABSOLUTE", label: t("workflow.admin.warning_mode_absolute") },
  { value: "PERCENT", label: t("workflow.admin.warning_mode_percent") },
]

export function warningUnitOptions(mode: string, t: TFn): SelectOption[] {
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

export function subsystemLabel(value: string, t: TFn) {
  return (
    businessSubsystemOptions(t).find((item) => item.value === value)?.label ??
    value
  )
}

export function templateTokens(subsystem: string, t: TFn): SelectOption[] {
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

export function renderDescriptionPreview(pattern: string, t: TFn) {
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

export function toSlaTaskForm(task: SlaTaskPolicy): SlaTaskForm {
  return {
    ...task,
    durationValue: String(task.durationValue),
    warningValue: String(task.warningValue),
    sortOrder: String(task.sortOrder || 10),
    effectiveFrom: toDateInputValue(task.effectiveFrom),
    effectiveTo: toDateInputValue(task.effectiveTo),
  }
}

export function newSlaTaskPolicy(sortOrder: number, escalationRole = ""): SlaTaskForm {
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

export function summarizeSlaTasks(items: SlaTaskForm[]) {
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

export function toMinutes(value: number, unit: string) {
  if (unit === "HOUR") return value * 60
  return value
}

export function toDateInputValue(value?: string) {
  if (!value) return ""
  // Resolve the calendar day in the app timezone instead of slicing the
  // UTC instant (docs/db-schema-conventions.md §8).
  return dateInputValue(value)
}

export function fromDateInputValue(value: string) {
  // Day boundary at business-tz midnight so effective windows start at
  // 00:00 Asia/Ho_Chi_Minh, not 07:00 local.
  return value ? `${value}T00:00:00+07:00` : undefined
}

export function todayDateInput() {
  return todayISO()
}

export function formatDateOnly(value?: string) {
  if (!value) return ""
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeZone: APP_TIMEZONE,
  }).format(new Date(value))
}

export function formatAmountRange(min?: number, max?: number) {
  if (min == null && max == null) return "-"
  return `${min ?? 0} - ${max ?? "..."}`
}

export function numberOrUndefined(value: string) {
  if (!value) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}
