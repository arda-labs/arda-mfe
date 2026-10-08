import { Plus, Trash2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { useI18n } from "@workspace/i18n"
import { useEffect, useState } from "react"
import { caseConfigApi, casesApi, definitionsApi, processRolesApi } from "../api"
import { PrincipalPicker } from "../components/principal-picker"
import { notify } from "@workspace/ui/feedback/notify"
import type {
  DescriptionTemplate,
  ProcessRole,
  SlaPolicy,
  WorkflowAssignmentRule,
  WorkflowCaseType,
  WorkflowDelegation,
  WorkflowProcessDefinition,
  WorkflowRoleCatalog,
  WorkflowRoleMembership,
} from "../api"

import * as AdminUi from './admin-ui'
import type { SlaTaskForm } from './admin-ui'

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
        await definitionsApi.updateProcessDefinition(item.id, payload)
      } else {
        await definitionsApi.importProcessDefinition(payload)
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
            <AdminUi.Field
              label={t("workflow.admin.field_process_code")}
              value={item.processCode}
            />
          ) : (
            <AdminUi.TextInput
              label={t("workflow.admin.field_process_code")}
              value={form.processCode}
              onChange={(processCode) => setForm({ ...form, processCode })}
            />
          )}
          <AdminUi.TextInput
            label={t("workflow.admin.field_display_name")}
            value={form.name}
            onChange={(name) => setForm({ ...form, name })}
          />
          <AdminUi.SelectInput
            label={t("workflow.admin.field_status_after_import")}
            value={form.status}
            options={AdminUi.configStatusOptions(t)}
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
        <AdminUi.DialogActions
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
  businessAreaOptions: AdminUi.SelectOption[]
  roleOptions: AdminUi.SelectOption[]
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
        await casesApi.updateCaseType(item.caseType, payload)
      } else {
        await casesApi.createCaseType(payload)
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
    <AdminUi.ConfigDialog
      title={
        item
          ? t("workflow.admin.dialog_case_type_edit")
          : t("workflow.admin.dialog_case_type_create")
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      <AdminUi.TextInput
        label={t("workflow.admin.field_case_type_code")}
        value={form.caseType}
        onChange={(caseType) => setForm({ ...form, caseType })}
        disabled={Boolean(item)}
      />
      <AdminUi.SelectInput
        label={t("workflow.admin.field_business_area")}
        value={form.businessArea}
        options={businessAreaOptions}
        onChange={(businessArea) => setForm({ ...form, businessArea })}
      />
      <AdminUi.TextInput
        label={t("workflow.admin.field_operation_name")}
        value={form.operationName}
        onChange={(operationName) => setForm({ ...form, operationName })}
      />
      <AdminUi.SelectInput
        label={t("workflow.admin.field_owner_service")}
        value={form.ownerService}
        options={AdminUi.ownerServiceOptions}
        onChange={(ownerService) => setForm({ ...form, ownerService })}
      />
      <AdminUi.TextInput
        label={t("workflow.admin.field_bpmn_process_id")}
        value={form.bpmnProcessId}
        onChange={(bpmnProcessId) => setForm({ ...form, bpmnProcessId })}
      />
      <AdminUi.TextInput
        label={t("workflow.admin.field_bpmn_version")}
        value={form.bpmnVersion}
        onChange={(bpmnVersion) => setForm({ ...form, bpmnVersion })}
      />
      <AdminUi.SearchSelect
        label={t("workflow.admin.field_maker_role")}
        value={form.makerRole}
        options={roleOptions}
        allowCustom
        onChange={(makerRole) => setForm({ ...form, makerRole })}
      />
      <AdminUi.SearchSelect
        label={t("workflow.admin.field_checker_role")}
        value={form.checkerRole}
        options={roleOptions}
        allowCustom
        onChange={(checkerRole) => setForm({ ...form, checkerRole })}
      />
      <AdminUi.SelectInput
        label={t("workflow.admin.field_status")}
        value={form.status}
        options={AdminUi.configStatusOptions(t)}
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
      <AdminUi.DialogActions
        onCancel={() => onOpenChange(false)}
        onSave={save}
        pending={saving}
        disabled={!canSave}
      />
    </AdminUi.ConfigDialog>
  )
}

export function ProcessConfigDialog({
  item,
  roleOptions,
  slaOptions,
  onOpenChange,
}: {
  item?: WorkflowCaseType
  roleOptions: AdminUi.SelectOption[]
  slaOptions: AdminUi.SelectOption[]
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
      await caseConfigApi.updateProcessConfig(item.caseType, {
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
          <AdminUi.TextInput
            label={t("workflow.admin.field_bpmn_process_id")}
            value={form.bpmnProcessId}
            onChange={(bpmnProcessId) => setForm({ ...form, bpmnProcessId })}
          />
          <AdminUi.TextInput
            label={t("workflow.admin.field_bpmn_version")}
            value={form.bpmnVersion}
            onChange={(bpmnVersion) => setForm({ ...form, bpmnVersion })}
          />
          <AdminUi.SearchSelect
            label={t("workflow.admin.field_default_sla")}
            value={form.defaultSlaPolicyId}
            options={slaOptions}
            emptyLabel={t("workflow.admin.empty_no_sla")}
            onChange={(defaultSlaPolicyId) =>
              setForm({ ...form, defaultSlaPolicyId })
            }
          />
          <AdminUi.SearchSelect
            label={t("workflow.admin.field_maker_role")}
            value={form.makerRole}
            options={roleOptions}
            allowCustom
            onChange={(makerRole) => setForm({ ...form, makerRole })}
          />
          <AdminUi.SearchSelect
            label={t("workflow.admin.field_checker_role")}
            value={form.checkerRole}
            options={roleOptions}
            allowCustom
            onChange={(checkerRole) => setForm({ ...form, checkerRole })}
          />
          <AdminUi.SelectInput
            label={t("workflow.admin.field_status")}
            value={form.status}
            options={AdminUi.configStatusOptions(t)}
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
          <AdminUi.DialogActions
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
  caseTypeOptions: AdminUi.SelectOption[]
  roleOptions: AdminUi.SelectOption[]
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
    effectiveFrom: AdminUi.toDateInputValue(item?.effectiveFrom) || AdminUi.todayDateInput(),
    effectiveTo: AdminUi.toDateInputValue(item?.effectiveTo),
    taskPolicies: item?.taskPolicies?.length
      ? item.taskPolicies.map(AdminUi.toSlaTaskForm)
      : [AdminUi.newSlaTaskPolicy(10, item?.escalationRole)],
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
      const summary = AdminUi.summarizeSlaTasks(form.taskPolicies)
      const payload = {
        ...form,
        dueInHours: summary.dueInHours,
        warningInHours: summary.warningInHours,
        effectiveFrom: AdminUi.fromDateInputValue(form.effectiveFrom),
        effectiveTo: AdminUi.fromDateInputValue(form.effectiveTo),
        taskPolicies: form.taskPolicies.map((task, index) => ({
          ...task,
          durationValue: Number(task.durationValue) || 1,
          warningValue: Number(task.warningValue) || 0,
          sortOrder: Number(task.sortOrder) || (index + 1) * 10,
          effectiveFrom: AdminUi.fromDateInputValue(task.effectiveFrom),
          effectiveTo: AdminUi.fromDateInputValue(task.effectiveTo),
        })),
      }
      if (item?.id) {
        await caseConfigApi.updateSlaPolicy(item.id, payload)
      } else {
        await caseConfigApi.createSlaPolicy(payload)
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
    <AdminUi.ConfigDialog
      title={
        item ? t("workflow.admin.dialog_sla_edit") : t("workflow.admin.dialog_sla_create")
      }
      open={open}
      wide
      onOpenChange={onOpenChange}
    >
      <div className="grid gap-3 lg:grid-cols-3">
        <AdminUi.TextInput
          label={t("workflow.admin.col_sla_code")}
          value={form.code}
          onChange={(code) => setForm({ ...form, code })}
        />
        <AdminUi.TextInput
          label={t("workflow.admin.col_sla_name")}
          value={form.name}
          onChange={(name) => setForm({ ...form, name })}
        />
        <AdminUi.SearchSelect
          label={t("workflow.admin.col_case_type")}
          value={form.caseType}
          options={caseTypeOptions}
          onChange={(caseType) => setForm({ ...form, caseType })}
        />
        <AdminUi.SearchSelect
          label={t("workflow.admin.field_escalation_role")}
          value={form.escalationRole}
          options={roleOptions}
          allowCustom
          onChange={(escalationRole) => setForm({ ...form, escalationRole })}
        />
        <AdminUi.DateInput
          label={t("workflow.admin.field_effective_from")}
          value={form.effectiveFrom}
          onChange={(effectiveFrom) => setForm({ ...form, effectiveFrom })}
        />
        <AdminUi.DateInput
          label={t("workflow.admin.field_effective_to")}
          value={form.effectiveTo}
          onChange={(effectiveTo) => setForm({ ...form, effectiveTo })}
        />
        <AdminUi.SelectInput
          label={t("workflow.admin.field_status")}
          value={form.status}
          options={AdminUi.configStatusOptions(t)}
          onChange={(status) => setForm({ ...form, status })}
        />
      </div>

      <SlaTaskPolicyEditor
        items={form.taskPolicies}
        roleOptions={roleOptions}
        defaultEscalationRole={form.escalationRole}
        onChange={(taskPolicies) => setForm({ ...form, taskPolicies })}
      />

      <AdminUi.DialogActions
        onCancel={() => onOpenChange(false)}
        onSave={save}
        pending={saving}
        disabled={!canSave}
      />
    </AdminUi.ConfigDialog>
  )
}

function SlaTaskPolicyEditor({
  items,
  roleOptions,
  defaultEscalationRole,
  onChange,
}: {
  items: SlaTaskForm[]
  roleOptions: AdminUi.SelectOption[]
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
              AdminUi.newSlaTaskPolicy((items.length + 1) * 10, defaultEscalationRole),
            ])
          }
        >
          <Plus className="size-4" />
          {t("workflow.admin.sla_task_add")}
        </Button>
      </div>
      <AdminUi.DataShell>
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
                  <AdminUi.InlineSelect
                    value={item.durationUnit}
                    options={AdminUi.durationUnitOptions(t)}
                    onChange={(durationUnit) =>
                      update(index, {
                        durationUnit:
                          durationUnit as SlaTaskForm["durationUnit"],
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <AdminUi.InlineSelect
                    value={item.warningMode}
                    options={AdminUi.warningModeOptions(t)}
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
                  <AdminUi.InlineSelect
                    value={item.warningUnit}
                    options={AdminUi.warningUnitOptions(item.warningMode, t)}
                    onChange={(warningUnit) =>
                      update(index, {
                        warningUnit: warningUnit as SlaTaskForm["warningUnit"],
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <AdminUi.SearchSelect
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
                  <AdminUi.InlineSelect
                    value={item.status}
                    options={AdminUi.configStatusOptions(t)}
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
      </AdminUi.DataShell>
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
  caseTypeOptions: AdminUi.SelectOption[]
  subsystemOptions: AdminUi.SelectOption[]
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
  const tokens = AdminUi.templateTokens(form.businessSubsystem, t)
  const preview = AdminUi.renderDescriptionPreview(form.pattern, t)
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
        await caseConfigApi.updateDescriptionTemplate(item.id, payload)
      } else {
        await caseConfigApi.createDescriptionTemplate(payload)
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
    <AdminUi.ConfigDialog
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
        <AdminUi.TextInput
          label={t("workflow.admin.field_template_code")}
          value={form.code}
          onChange={(code) => setForm({ ...form, code })}
        />
        <AdminUi.SelectInput
          label={t("workflow.admin.field_business_subsystem")}
          value={form.businessSubsystem}
          options={subsystemOptions}
          onChange={(businessSubsystem) =>
            setForm({ ...form, businessSubsystem })
          }
        />
        <AdminUi.SearchSelect
          label={t("workflow.admin.col_case_type")}
          value={form.caseType}
          options={caseTypeOptions}
          onChange={(caseType) => setForm({ ...form, caseType })}
        />
        <AdminUi.SelectInput
          label={t("workflow.admin.field_status")}
          value={form.status}
          options={AdminUi.configStatusOptions(t)}
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

      <AdminUi.DialogActions
        onCancel={() => onOpenChange(false)}
        onSave={save}
        pending={saving}
        disabled={!canSave}
      />
    </AdminUi.ConfigDialog>
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
  caseTypeOptions: AdminUi.SelectOption[]
  iamRoleOptions: AdminUi.SelectOption[]
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
        await processRolesApi.updateProcessRole(item.id, form)
      } else {
        await processRolesApi.createProcessRole(form)
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
    <AdminUi.ConfigDialog
      title={
        item
          ? t("workflow.admin.dialog_process_role_edit")
          : t("workflow.admin.dialog_process_role_create")
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      <AdminUi.SearchSelect
        label={t("workflow.admin.col_case_type")}
        value={form.caseType}
        options={caseTypeOptions}
        onChange={(caseType) => setForm({ ...form, caseType })}
      />
      <AdminUi.TextInput
        label={t("workflow.admin.field_process_step")}
        value={form.stepCode}
        onChange={(stepCode) => setForm({ ...form, stepCode })}
      />
      <AdminUi.TextInput
        label={t("workflow.admin.field_business_role")}
        value={form.businessRole}
        onChange={(businessRole) => setForm({ ...form, businessRole })}
      />
      <AdminUi.SearchSelect
        label={t("workflow.admin.col_iam_role")}
        value={form.iamRole}
        options={iamRoleOptions}
        allowCustom
        onChange={(iamRole) => setForm({ ...form, iamRole })}
      />
      <AdminUi.SelectInput
        label={t("workflow.admin.col_action_scope")}
        value={form.actionScope}
        options={AdminUi.actionScopeOptions(t)}
        onChange={(actionScope) => setForm({ ...form, actionScope })}
      />
      <AdminUi.SelectInput
        label={t("workflow.admin.field_status")}
        value={form.status}
        options={AdminUi.configStatusOptions(t)}
        onChange={(status) => setForm({ ...form, status })}
      />
      <AdminUi.DialogActions
        onCancel={() => onOpenChange(false)}
        onSave={save}
        pending={saving}
      />
    </AdminUi.ConfigDialog>
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
        await processRolesApi.updateRoleCatalog(item.roleCode, form)
      } else {
        await processRolesApi.createRoleCatalog(form)
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
    <AdminUi.ConfigDialog
      title={
        item
          ? t("workflow.admin.dialog_role_catalog_edit")
          : t("workflow.admin.dialog_role_catalog_create")
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      <AdminUi.TextInput
        label={t("workflow.admin.field_role_code")}
        value={form.roleCode}
        disabled={Boolean(item)}
        onChange={(roleCode) => setForm({ ...form, roleCode })}
      />
      <AdminUi.TextInput
        label={t("workflow.admin.field_role_name")}
        value={form.roleName}
        onChange={(roleName) => setForm({ ...form, roleName })}
      />
      <AdminUi.SelectInput
        label={t("workflow.admin.field_role_type")}
        value={form.roleType}
        options={AdminUi.roleTypeOptions(t)}
        onChange={(roleType) => setForm({ ...form, roleType })}
      />
      <AdminUi.SelectInput
        label={t("workflow.admin.col_subsystem")}
        value={form.businessSubsystem}
        options={AdminUi.businessSubsystemOptions(t)}
        onChange={(businessSubsystem) =>
          setForm({ ...form, businessSubsystem })
        }
      />
      <AdminUi.SelectInput
        label={t("workflow.admin.field_status")}
        value={form.status}
        options={AdminUi.configStatusOptions(t)}
        onChange={(status) => setForm({ ...form, status })}
      />
      <AdminUi.DialogActions
        onCancel={() => onOpenChange(false)}
        onSave={save}
        pending={saving}
        disabled={!canSave}
      />
    </AdminUi.ConfigDialog>
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
  roleOptions: AdminUi.SelectOption[]
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
    effectiveFrom: AdminUi.toDateInputValue(item?.effectiveFrom) || AdminUi.todayDateInput(),
    effectiveTo: AdminUi.toDateInputValue(item?.effectiveTo),
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
      effectiveFrom: AdminUi.toDateInputValue(item?.effectiveFrom) || AdminUi.todayDateInput(),
      effectiveTo: AdminUi.toDateInputValue(item?.effectiveTo),
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
        minAmount: AdminUi.numberOrUndefined(form.minAmount),
        maxAmount: AdminUi.numberOrUndefined(form.maxAmount),
        effectiveFrom: AdminUi.fromDateInputValue(form.effectiveFrom),
        effectiveTo: AdminUi.fromDateInputValue(form.effectiveTo),
      }
      if (item?.id) {
        await processRolesApi.updateRoleMembership(payload.tenantId, item.id, payload)
      } else {
        await processRolesApi.createRoleMembership(payload.tenantId, payload)
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
    <AdminUi.ConfigDialog
      title={
        item
          ? t("workflow.admin.dialog_role_membership_edit")
          : t("workflow.admin.dialog_role_membership_add")
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      <AdminUi.SearchSelect
        label={t("workflow.admin.col_role")}
        value={form.roleCode}
        options={roleOptions}
        onChange={(roleCode) => setForm({ ...form, roleCode })}
      />
      <AdminUi.SelectInput
        label={t("workflow.admin.field_principal_type")}
        value={form.principalType}
        options={AdminUi.principalTypeOptions}
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
        <AdminUi.TextInput
          label="Tenant"
          value={form.tenantId}
          onChange={(tenantId) => setForm({ ...form, tenantId })}
        />
        <AdminUi.TextInput
          label={t("workflow.admin.field_org_unit")}
          value={form.orgId}
          onChange={(orgId) => setForm({ ...form, orgId })}
        />
        <AdminUi.TextInput
          label={t("workflow.admin.field_branch")}
          value={form.branchId}
          onChange={(branchId) => setForm({ ...form, branchId })}
        />
        <AdminUi.TextInput
          label={t("workflow.admin.field_product")}
          value={form.productCode}
          onChange={(productCode) => setForm({ ...form, productCode })}
        />
        <AdminUi.TextInput
          label={t("workflow.admin.field_min_amount")}
          value={form.minAmount}
          onChange={(minAmount) => setForm({ ...form, minAmount })}
        />
        <AdminUi.TextInput
          label={t("workflow.admin.field_max_amount")}
          value={form.maxAmount}
          onChange={(maxAmount) => setForm({ ...form, maxAmount })}
        />
        <AdminUi.DateInput
          label={t("workflow.admin.field_effective_from")}
          value={form.effectiveFrom}
          onChange={(effectiveFrom) => setForm({ ...form, effectiveFrom })}
        />
        <AdminUi.DateInput
          label={t("workflow.admin.field_effective_to")}
          value={form.effectiveTo}
          onChange={(effectiveTo) => setForm({ ...form, effectiveTo })}
        />
      </div>
      <AdminUi.SelectInput
        label={t("workflow.admin.field_status")}
        value={form.status}
        options={AdminUi.configStatusOptions(t)}
        onChange={(status) => setForm({ ...form, status })}
      />
      <AdminUi.DialogActions
        onCancel={() => onOpenChange(false)}
        onSave={save}
        pending={saving}
        disabled={!canSave}
      />
    </AdminUi.ConfigDialog>
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
  caseTypeOptions: AdminUi.SelectOption[]
  roleOptions: AdminUi.SelectOption[]
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
        await processRolesApi.updateAssignmentRule(item.id, payload)
      } else {
        await processRolesApi.createAssignmentRule(payload)
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
    <AdminUi.ConfigDialog
      title={
        item
          ? t("workflow.admin.dialog_assignment_edit")
          : t("workflow.admin.dialog_assignment_create")
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      <AdminUi.SearchSelect
        label={t("workflow.admin.col_case_type")}
        value={form.caseType}
        options={caseTypeOptions}
        onChange={(caseType) => setForm({ ...form, caseType })}
      />
      <AdminUi.TextInput
        label={t("workflow.admin.field_process_step")}
        value={form.stepCode}
        onChange={(stepCode) => setForm({ ...form, stepCode })}
      />
      <AdminUi.SearchSelect
        label={t("workflow.admin.field_process_role")}
        value={form.roleCode}
        options={roleOptions}
        onChange={(roleCode) => setForm({ ...form, roleCode })}
      />
      <AdminUi.SelectInput
        label={t("workflow.admin.field_assignment_mode")}
        value={form.assignmentMode}
        options={AdminUi.assignmentModeOptions(t)}
        onChange={(assignmentMode) => setForm({ ...form, assignmentMode })}
      />
      <AdminUi.SearchSelect
        label={t("workflow.admin.col_fallback")}
        value={form.fallbackRoleCode}
        options={roleOptions}
        emptyLabel={t("workflow.admin.empty_none")}
        onChange={(fallbackRoleCode) => setForm({ ...form, fallbackRoleCode })}
      />
      <AdminUi.TextInput
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
      <AdminUi.SelectInput
        label={t("workflow.admin.field_status")}
        value={form.status}
        options={AdminUi.configStatusOptions(t)}
        onChange={(status) => setForm({ ...form, status })}
      />
      <AdminUi.DialogActions
        onCancel={() => onOpenChange(false)}
        onSave={save}
        pending={saving}
        disabled={!canSave}
      />
    </AdminUi.ConfigDialog>
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
  roleOptions: AdminUi.SelectOption[]
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    fromPrincipalId: item?.fromPrincipalId ?? "",
    toPrincipalId: item?.toPrincipalId ?? "",
    roleCode: item?.roleCode ?? "",
    effectiveFrom: AdminUi.toDateInputValue(item?.effectiveFrom) || AdminUi.todayDateInput(),
    effectiveTo: AdminUi.toDateInputValue(item?.effectiveTo),
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
        effectiveFrom: AdminUi.fromDateInputValue(form.effectiveFrom),
        effectiveTo: AdminUi.fromDateInputValue(form.effectiveTo),
      }
      if (item?.id) {
        await processRolesApi.updateDelegation(tenantId, item.id, payload)
      } else {
        await processRolesApi.createDelegation(tenantId, payload)
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
    <AdminUi.ConfigDialog
      title={
        item
          ? t("workflow.admin.dialog_delegation_edit")
          : t("workflow.admin.dialog_delegation_create")
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      <AdminUi.SearchSelect
        label={t("workflow.admin.field_delegation_role")}
        value={form.roleCode}
        options={roleOptions}
        onChange={(roleCode) => setForm({ ...form, roleCode })}
      />
      <AdminUi.TextInput
        label={t("workflow.admin.field_from_user")}
        value={form.fromPrincipalId}
        onChange={(fromPrincipalId) => setForm({ ...form, fromPrincipalId })}
      />
      <AdminUi.TextInput
        label={t("workflow.admin.field_to_user")}
        value={form.toPrincipalId}
        onChange={(toPrincipalId) => setForm({ ...form, toPrincipalId })}
      />
      <AdminUi.DateInput
        label={t("workflow.admin.field_effective_from")}
        value={form.effectiveFrom}
        onChange={(effectiveFrom) => setForm({ ...form, effectiveFrom })}
      />
      <AdminUi.DateInput
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
      <AdminUi.SelectInput
        label={t("workflow.admin.field_status")}
        value={form.status}
        options={AdminUi.configStatusOptions(t)}
        onChange={(status) => setForm({ ...form, status })}
      />
      <AdminUi.DialogActions
        onCancel={() => onOpenChange(false)}
        onSave={save}
        pending={saving}
        disabled={!canSave}
      />
    </AdminUi.ConfigDialog>
  )
}

