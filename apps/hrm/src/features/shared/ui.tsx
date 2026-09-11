import { useState, type ChangeEvent, type ReactNode } from "react"
import type { UseFormReturn } from "react-hook-form"
import { useFieldArray } from "react-hook-form"
import { getMediaContentUrl } from "@workspace/media"
import { useI18n } from "@workspace/i18n"
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
import { Checkbox } from "@workspace/ui/components/checkbox"
import { FormField } from "@workspace/ui/components/form-field"
import { ImageCropDialog } from "@workspace/ui/components/image-crop-dialog"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"
import { Edit2, Plus, Trash2, Upload } from "lucide-react"
import type { EmployeeRegistration, OrgUnit, Position } from "../api"
import { fieldClass, type RegistrationValues } from "./schemas"
import { useWatch } from "react-hook-form"

export function RegistrationTabsList({
  compact = false,
}: {
  compact?: boolean
}) {
  const { t } = useI18n()
  return (
    <TabsList
      className={cn(
        "flex h-auto justify-start",
        compact
          ? "scrollbar-none max-w-full flex-nowrap overflow-x-auto"
          : "flex-wrap"
      )}
    >
      <TabsTrigger value="general">
        {t("hrm.registrations.tab.general")}
      </TabsTrigger>
      <TabsTrigger value="family">
        {t("hrm.registrations.tab.family")}
      </TabsTrigger>
      <TabsTrigger value="delegation">
        {t("hrm.registrations.tab.delegation")}
      </TabsTrigger>
      <TabsTrigger value="attachments">
        {t("hrm.registrations.tab.attachments")}
      </TabsTrigger>
    </TabsList>
  )
}

export function RegistrationGeneralPanel({
  avatarFileId,
  form,
  orgUnits,
  uploadingAvatar,
  onClearAvatar,
  onUploadAvatar,
}: {
  avatarFileId: string
  form: UseFormReturn<RegistrationValues>
  orgUnits: OrgUnit[]
  uploadingAvatar: boolean
  onClearAvatar: () => void
  onUploadAvatar: (file: File) => Promise<void>
}) {
  const { t } = useI18n()
  return (
    <section className="space-y-3 rounded-md border p-4">
      <h2 className="text-sm font-semibold">
        {t("hrm.registrations.tab.general")}
      </h2>
      <div className="grid gap-4 xl:grid-cols-[1fr_220px]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FormField label={t("hrm.registrations.field.employee_code")}>
            <Input {...form.register("employee_code")} />
          </FormField>
          <FormField
            label={t("hrm.registrations.field.employee_type")}
            error={form.formState.errors.employee_type?.message}
          >
            <select className={fieldClass} {...form.register("employee_type")}>
              <option value="EMPLOYEE">
                {t("hrm.registrations.option.employee")}
              </option>
              <option value="COLLABORATOR">
                {t("hrm.registrations.option.collaborator")}
              </option>
              <option value="INTERN">
                {t("hrm.registrations.option.intern")}
              </option>
            </select>
          </FormField>
          <FormField
            label={t("hrm.registrations.field.org_unit")}
            error={form.formState.errors.org_unit_id?.message}
          >
            <select className={fieldClass} {...form.register("org_unit_id")}>
              <option value="">{t("hrm.registrations.select.org_unit")}</option>
              {orgUnits.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label={t("hrm.registrations.field.full_name")}
            error={form.formState.errors.full_name?.message}
          >
            <Input {...form.register("full_name")} />
          </FormField>
          <FormField label={t("hrm.registrations.field.date_of_birth")}>
            <Input
              {...form.register("date_of_birth")}
              placeholder="dd/MM/yyyy"
            />
          </FormField>
          <FormField label={t("hrm.registrations.field.gender")}>
            <select className={fieldClass} {...form.register("gender")}>
              <option value="">{t("hrm.registrations.select.gender")}</option>
              <option value="MALE">{t("hrm.registrations.option.male")}</option>
              <option value="FEMALE">
                {t("hrm.registrations.option.female")}
              </option>
              <option value="OTHER">
                {t("hrm.registrations.option.other")}
              </option>
            </select>
          </FormField>
          <FormField label={t("hrm.registrations.field.mobile")}>
            <Input {...form.register("mobile")} />
          </FormField>
          <FormField
            label={t("hrm.registrations.field.email")}
            error={form.formState.errors.email?.message}
          >
            <Input {...form.register("email")} />
          </FormField>
          <FormField label={t("hrm.registrations.field.marital_status")}>
            <select className={fieldClass} {...form.register("marital_status")}>
              <option value="">{t("hrm.registrations.select.marital")}</option>
              <option value="SINGLE">
                {t("hrm.registrations.option.single")}
              </option>
              <option value="MARRIED">
                {t("hrm.registrations.option.married")}
              </option>
              <option value="OTHER">
                {t("hrm.registrations.option.other")}
              </option>
            </select>
          </FormField>
          <FormField
            label={t("hrm.registrations.field.identity_no")}
            error={form.formState.errors.identity_no?.message}
          >
            <Input {...form.register("identity_no")} />
          </FormField>
          <FormField label={t("hrm.registrations.field.identity_issue_place")}>
            <Input {...form.register("identity_issue_place")} />
          </FormField>
          <FormField label={t("hrm.registrations.field.identity_issue_date")}>
            <Input
              {...form.register("identity_issue_date")}
              placeholder="dd/MM/yyyy"
            />
          </FormField>
          <FormField label={t("hrm.registrations.field.identity_expiry_date")}>
            <Input
              {...form.register("identity_expiry_date")}
              placeholder="dd/MM/yyyy"
            />
          </FormField>
          <FormField label={t("hrm.registrations.field.start_date")}>
            <Input {...form.register("start_date")} placeholder="dd/MM/yyyy" />
          </FormField>
          <FormField label={t("hrm.registrations.field.official_date")}>
            <Input
              {...form.register("official_date")}
              placeholder="dd/MM/yyyy"
            />
          </FormField>
          <FormField
            label={t("hrm.registrations.field.address")}
            className="xl:col-span-2"
            error={form.formState.errors.address?.message}
          >
            <Input {...form.register("address")} />
          </FormField>
          <FormField
            label={t("hrm.registrations.field.permanent_address")}
            className="xl:col-span-2"
            error={form.formState.errors.permanent_address?.message}
          >
            <Input {...form.register("permanent_address")} />
          </FormField>
        </div>
        <EmployeeAvatarUploader
          fileId={avatarFileId}
          uploading={uploadingAvatar}
          onClear={onClearAvatar}
          onUpload={onUploadAvatar}
        />
      </div>
    </section>
  )
}

export function EmployeeAvatarUploader({
  fileId,
  uploading,
  onClear,
  onUpload,
}: {
  fileId: string
  uploading: boolean
  onClear: () => void
  onUpload: (file: File) => Promise<void>
}) {
  const { t } = useI18n()
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    // Route through the crop dialog; onUpload receives the cropped file.
    setPendingFile(file)
    event.target.value = ""
  }

  return (
    <div className="space-y-2">
      <div className="flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-md border bg-muted/30">
        {fileId ? (
          <img
            alt={t("hrm.registrations.avatar.alt")}
            className="h-full w-full object-cover"
            src={getMediaContentUrl(fileId)}
          />
        ) : (
          <div className="px-4 text-center text-sm text-muted-foreground">
            {t("hrm.registrations.avatar.placeholder")}
          </div>
        )}
      </div>
      <label className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted">
        <Upload className="size-4" />
        {uploading
          ? t("hrm.registrations.avatar.uploading")
          : t("hrm.registrations.avatar.upload")}
        <input
          accept="image/*"
          className="sr-only"
          disabled={uploading}
          type="file"
          onChange={handleFile}
        />
      </label>
      {fileId ? (
        <Button
          className="w-full"
          disabled={uploading}
          type="button"
          variant="ghost"
          onClick={onClear}
        >
          {t("hrm.registrations.avatar.clear")}
        </Button>
      ) : null}
      <ImageCropDialog
        file={pendingFile}
        aspect={1}
        title={t("hrm.registrations.avatar.crop_title")}
        processing={uploading}
        onConfirm={(cropped) => {
          setPendingFile(null)
          void onUpload(cropped)
        }}
        onClose={() => setPendingFile(null)}
      />
    </div>
  )
}

export function AssignmentsTable({
  form,
  orgUnits,
  positions,
}: {
  form: UseFormReturn<RegistrationValues>
  orgUnits: OrgUnit[]
  positions: Position[]
}) {
  const rows = useFieldArray({ control: form.control, name: "assignments" })
  const { t } = useI18n()
  return (
    <InlineEditTable
      title={t("hrm.registrations.table.assignments.title")}
      columns={[
        t("common.field.stt"),
        t("hrm.registrations.table.assignments.work_unit"),
        t("hrm.registrations.table.assignments.department"),
        t("hrm.registrations.table.assignments.position"),
        t("hrm.registrations.table.assignments.effective_date"),
        t("hrm.registrations.table.assignments.expiry_date"),
      ]}
      onAdd={() =>
        rows.append({
          work_unit_id: "",
          department_id: "",
          position_id: "",
          effective_date: "",
          expiry_date: "",
        })
      }
      empty={t("hrm.registrations.table.assignments.empty")}
    >
      {rows.fields.map((row, index) => (
        <TableRow key={row.id}>
          <TableCell className="w-12 text-muted-foreground">
            {index + 1}
          </TableCell>
          <TableCell>
            <select
              className={fieldClass}
              {...form.register(`assignments.${index}.work_unit_id`)}
            >
              <option value="">{t("hrm.registrations.select.org_unit")}</option>
              {orgUnits.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
          </TableCell>
          <TableCell>
            <select
              className={fieldClass}
              {...form.register(`assignments.${index}.department_id`)}
            >
              <option value="">
                {t("hrm.registrations.select.department")}
              </option>
              {orgUnits.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
          </TableCell>
          <TableCell>
            <select
              className={fieldClass}
              {...form.register(`assignments.${index}.position_id`)}
            >
              <option value="">
                {t("hrm.registrations.select.position")}
              </option>
              {positions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
          </TableCell>
          <TableCell>
            <Input
              {...form.register(`assignments.${index}.effective_date`)}
              placeholder="dd/MM/yyyy"
            />
          </TableCell>
          <TableCell>
            <Input
              {...form.register(`assignments.${index}.expiry_date`)}
              placeholder="dd/MM/yyyy"
            />
          </TableCell>
          <InlineRowActions onDelete={() => rows.remove(index)} />
        </TableRow>
      ))}
    </InlineEditTable>
  )
}

export function EducationsTable({
  form,
}: {
  form: UseFormReturn<RegistrationValues>
}) {
  const rows = useFieldArray({ control: form.control, name: "educations" })
  const { t } = useI18n()
  return (
    <InlineEditTable
      title={t("hrm.registrations.table.educations.title")}
      columns={[
        t("common.field.stt"),
        t("hrm.registrations.table.educations.level"),
        t("hrm.registrations.table.educations.training_type"),
        t("hrm.registrations.table.educations.school"),
        t("hrm.registrations.table.educations.major"),
        t("hrm.registrations.table.educations.from_year"),
        t("hrm.registrations.table.educations.to_year"),
      ]}
      onAdd={() =>
        rows.append({
          education_level: "",
          training_type: "",
          school: "",
          major: "",
          from_year: "",
          to_year: "",
        })
      }
      empty={t("hrm.registrations.table.educations.empty")}
    >
      {rows.fields.map((row, index) => (
        <TableRow key={row.id}>
          <TableCell className="w-12 text-muted-foreground">
            {index + 1}
          </TableCell>
          <TableCell>
            <Input {...form.register(`educations.${index}.education_level`)} />
          </TableCell>
          <TableCell>
            <Input {...form.register(`educations.${index}.training_type`)} />
          </TableCell>
          <TableCell>
            <Input {...form.register(`educations.${index}.school`)} />
          </TableCell>
          <TableCell>
            <Input {...form.register(`educations.${index}.major`)} />
          </TableCell>
          <TableCell>
            <Input {...form.register(`educations.${index}.from_year`)} />
          </TableCell>
          <TableCell>
            <Input {...form.register(`educations.${index}.to_year`)} />
          </TableCell>
          <InlineRowActions onDelete={() => rows.remove(index)} />
        </TableRow>
      ))}
    </InlineEditTable>
  )
}

export function FamilyTable({
  form,
}: {
  form: UseFormReturn<RegistrationValues>
}) {
  const rows = useFieldArray({ control: form.control, name: "family_members" })
  const familyMembers = useWatch({
    control: form.control,
    name: "family_members",
  })
  const { t } = useI18n()
  return (
    <InlineEditTable
      title={t("hrm.registrations.table.family.title")}
      columns={[
        t("common.field.stt"),
        t("hrm.registrations.table.family.relationship"),
        t("hrm.registrations.table.family.full_name"),
        t("hrm.registrations.table.family.date_of_birth"),
        t("hrm.registrations.table.family.phone"),
        t("hrm.registrations.table.family.address"),
        t("hrm.registrations.table.family.dependent"),
      ]}
      onAdd={() =>
        rows.append({
          relationship: "",
          full_name: "",
          date_of_birth: "",
          phone: "",
          address: "",
          dependent: false,
        })
      }
      empty={t("hrm.registrations.table.family.empty")}
    >
      {rows.fields.map((row, index) => (
        <TableRow key={row.id}>
          <TableCell className="w-12 text-muted-foreground">
            {index + 1}
          </TableCell>
          <TableCell>
            <Input {...form.register(`family_members.${index}.relationship`)} />
          </TableCell>
          <TableCell>
            <Input {...form.register(`family_members.${index}.full_name`)} />
          </TableCell>
          <TableCell>
            <Input
              {...form.register(`family_members.${index}.date_of_birth`)}
              placeholder="dd/MM/yyyy"
            />
          </TableCell>
          <TableCell>
            <Input {...form.register(`family_members.${index}.phone`)} />
          </TableCell>
          <TableCell>
            <Input {...form.register(`family_members.${index}.address`)} />
          </TableCell>
          <TableCell>
            <Checkbox
              checked={familyMembers?.[index]?.dependent ?? false}
              onCheckedChange={(value) =>
                form.setValue(
                  `family_members.${index}.dependent`,
                  Boolean(value),
                  { shouldDirty: true }
                )
              }
            />
          </TableCell>
          <InlineRowActions onDelete={() => rows.remove(index)} />
        </TableRow>
      ))}
    </InlineEditTable>
  )
}

export function DelegationsTable({
  form,
}: {
  form: UseFormReturn<RegistrationValues>
}) {
  const rows = useFieldArray({ control: form.control, name: "delegations" })
  const { t } = useI18n()
  return (
    <InlineEditTable
      title={t("hrm.registrations.table.delegations.title")}
      columns={[
        t("common.field.stt"),
        t("hrm.registrations.table.delegations.employee_code"),
        t("hrm.registrations.table.delegations.employee_name"),
        t("hrm.registrations.table.delegations.department"),
        t("hrm.registrations.table.delegations.position"),
        t("hrm.registrations.table.delegations.decision_no"),
        t("hrm.registrations.table.delegations.content"),
        t("hrm.registrations.table.delegations.effective_date"),
        t("hrm.registrations.table.delegations.expiry_date"),
      ]}
      onAdd={() =>
        rows.append({
          employee_code: "",
          employee_name: "",
          department: "",
          position: "",
          decision_no: "",
          content: "",
          effective_date: "",
          expiry_date: "",
        })
      }
      empty={t("hrm.registrations.table.delegations.empty")}
    >
      {rows.fields.map((row, index) => (
        <TableRow key={row.id}>
          <TableCell className="w-12 text-muted-foreground">
            {index + 1}
          </TableCell>
          <TableCell>
            <Input {...form.register(`delegations.${index}.employee_code`)} />
          </TableCell>
          <TableCell>
            <Input {...form.register(`delegations.${index}.employee_name`)} />
          </TableCell>
          <TableCell>
            <Input {...form.register(`delegations.${index}.department`)} />
          </TableCell>
          <TableCell>
            <Input {...form.register(`delegations.${index}.position`)} />
          </TableCell>
          <TableCell>
            <Input {...form.register(`delegations.${index}.decision_no`)} />
          </TableCell>
          <TableCell>
            <Input {...form.register(`delegations.${index}.content`)} />
          </TableCell>
          <TableCell>
            <Input
              {...form.register(`delegations.${index}.effective_date`)}
              placeholder="dd/MM/yyyy"
            />
          </TableCell>
          <TableCell>
            <Input
              {...form.register(`delegations.${index}.expiry_date`)}
              placeholder="dd/MM/yyyy"
            />
          </TableCell>
          <InlineRowActions onDelete={() => rows.remove(index)} />
        </TableRow>
      ))}
    </InlineEditTable>
  )
}

export function AttachmentsTable({
  form,
}: {
  form: UseFormReturn<RegistrationValues>
}) {
  const rows = useFieldArray({ control: form.control, name: "attachments" })
  const { t } = useI18n()
  return (
    <InlineEditTable
      title={t("hrm.registrations.table.attachments.title")}
      columns={[
        t("common.field.stt"),
        t("hrm.registrations.table.attachments.document_type"),
        t("hrm.registrations.table.attachments.document_name"),
        t("hrm.registrations.table.attachments.file_name"),
        t("hrm.registrations.table.attachments.note"),
      ]}
      onAdd={() =>
        rows.append({
          document_type: "",
          document_name: "",
          file_name: "",
          note: "",
        })
      }
      empty={t("hrm.registrations.table.attachments.empty")}
    >
      {rows.fields.map((row, index) => (
        <TableRow key={row.id}>
          <TableCell className="w-12 text-muted-foreground">
            {index + 1}
          </TableCell>
          <TableCell>
            <Input {...form.register(`attachments.${index}.document_type`)} />
          </TableCell>
          <TableCell>
            <Input {...form.register(`attachments.${index}.document_name`)} />
          </TableCell>
          <TableCell>
            <Input {...form.register(`attachments.${index}.file_name`)} />
          </TableCell>
          <TableCell>
            <Input {...form.register(`attachments.${index}.note`)} />
          </TableCell>
          <InlineRowActions onDelete={() => rows.remove(index)} />
        </TableRow>
      ))}
    </InlineEditTable>
  )
}

export function InlineEditTable({
  title,
  columns,
  children,
  empty,
  onAdd,
}: {
  title: string
  columns: string[]
  children: ReactNode
  empty: string
  onAdd: () => void
}) {
  const { t } = useI18n()
  const rows = Array.isArray(children) ? children : [children]
  const hasRows = rows.some(Boolean)
  return (
    <section className="space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="size-4" />
          {t("hrm.common.add_row")}
        </Button>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
              <TableHead className="w-16 text-right">
                {t("common.field.action")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasRows ? (
              children
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="h-20 text-center text-muted-foreground"
                >
                  {empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

export function InlineRowActions({ onDelete }: { onDelete: () => void }) {
  return (
    <TableCell className="text-right">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-8 text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="size-4" />
      </Button>
    </TableCell>
  )
}

export function RegistrationMetaBar({
  registration,
}: {
  registration: EmployeeRegistration | null
}) {
  const { t } = useI18n()
  if (!registration?.registration_code) return null
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-4 py-3 text-sm">
      <span>
        {t("hrm.registrations.meta.registration_code")}{" "}
        <span className="font-mono font-medium">
          {registration.registration_code}
        </span>
      </span>
      {registration.workflow_case_id ? (
        <span className="text-muted-foreground">
          {t("hrm.registrations.meta.case_bpm")}{" "}
          <span className="font-mono">{registration.workflow_case_id}</span>
        </span>
      ) : null}
    </div>
  )
}

export function toRegistrationPayload(
  values: RegistrationValues
): Record<string, unknown> {
  return {
    employee_code: textOrUndefined(values.employee_code),
    employee_type: values.employee_type,
    avatar_file_id: textOrUndefined(values.avatar_file_id),
    org_unit_id: values.org_unit_id,
    full_name: values.full_name.trim(),
    date_of_birth: textOrUndefined(values.date_of_birth),
    gender: textOrUndefined(values.gender),
    mobile: textOrUndefined(values.mobile),
    email: textOrUndefined(values.email),
    marital_status: textOrUndefined(values.marital_status),
    address: values.address.trim(),
    permanent_address: values.permanent_address.trim(),
    identity_no: values.identity_no.trim(),
    identity_issue_date: textOrUndefined(values.identity_issue_date),
    identity_expiry_date: textOrUndefined(values.identity_expiry_date),
    identity_issue_place: textOrUndefined(values.identity_issue_place),
    start_date: textOrUndefined(values.start_date),
    official_date: textOrUndefined(values.official_date),
    assignments: compactRows(values.assignments),
    educations: compactRows(values.educations),
    family_members: compactRows(values.family_members),
    delegations: compactRows(values.delegations),
    attachments: compactRows(values.attachments),
  }
}

export function compactRows<T extends Record<string, unknown>>(rows: T[]) {
  return rows.filter((row) =>
    Object.values(row).some((value) =>
      typeof value === "boolean" ? value : String(value ?? "").trim() !== ""
    )
  )
}

export function textOrUndefined(value: string | undefined) {
  const text = value?.trim()
  return text || undefined
}

export function registrationStatusLabel(
  status: string,
  t: (key: string) => string
): string {
  switch (status) {
    case "draft":
      return t("hrm.registrations.status.draft")
    case "submitted":
      return t("hrm.registrations.status.submitted")
    case "approved":
      return t("hrm.registrations.status.approved")
    case "rejected":
      return t("hrm.registrations.status.rejected")
    default:
      return status
  }
}
export function PageTitle({
  title,
  count,
  onCreate,
}: {
  title: string
  count: number
  onCreate: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <Button onClick={onCreate}>
        <Plus className="mr-1 size-4" /> {t("hrm.common.add")}
      </Button>
    </div>
  )
}

export function DataTable({
  children,
  columns,
  empty,
}: {
  children: ReactNode
  columns: string[]
  empty: string
}) {
  const { t } = useI18n()
  const rows = Array.isArray(children) ? children : [children]
  const hasRows = rows.some(Boolean)
  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
            <TableHead className="w-24 text-right">
              {t("common.field.action")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hasRows ? (
            children
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length + 1}
                className="h-24 text-center text-muted-foreground"
              >
                {empty}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <TableCell className="text-right">
      <div className="flex justify-end gap-1">
        <Button size="icon" variant="ghost" className="size-8" onClick={onEdit}>
          <Edit2 className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-8 text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </TableCell>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n()
  return (
    <Badge variant={status === "active" ? "default" : "secondary"}>
      {status === "active"
        ? t("hrm.status.active")
        : t("hrm.status.inactive")}
    </Badge>
  )
}

export function DialogActions({ pending }: { pending: boolean }) {
  const { t } = useI18n()
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="submit" disabled={pending}>
        {pending ? t("common.action.saving") : t("common.action.save")}
      </Button>
    </div>
  )
}

export function DeleteDialog({
  title,
  open,
  pending = false,
  onOpenChange,
  onConfirm,
}: {
  title: string
  open: boolean
  pending?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}) {
  const { t } = useI18n()
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("hrm.common.delete_warning")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {t("common.action.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() => void onConfirm()}
          >
            {pending ? t("hrm.common.deleting") : t("common.action.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
