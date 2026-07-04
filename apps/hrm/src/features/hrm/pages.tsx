import { useEffect, useMemo, useState } from "react"
import type { ChangeEvent, ReactNode } from "react"
import {
  useFieldArray,
  useForm,
  useWatch,
  type UseFormReturn,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { getMediaContentUrl } from "@workspace/media"
import { notify } from "@workspace/notifications/notify"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { PageTitle as CollapsingPageTitle } from "@workspace/ui/components/page-title"
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
import { Edit2, Plus, Send, Trash2, Upload } from "lucide-react"
import type { EmployeeRegistration, JobTitle, OrgUnit, Position } from "./api"
import {
  useCreateEmployeeRegistration,
  useCreateJobTitle,
  useCreateOrgUnit,
  useCreatePosition,
  useDeleteJobTitle,
  useDeleteOrgUnit,
  useDeletePosition,
  useEmployees,
  useJobTitles,
  useOrganizations,
  useOrgUnits,
  usePositions,
  useSubmitEmployeeRegistration,
  useUpdateJobTitle,
  useUpdateOrgUnit,
  useUpdatePosition,
  useUploadEmployeeAvatar,
} from "./queries"

const fieldClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"

const positionSchema = z.object({
  code: z.string().trim().min(1, "Ma chuc vu la bat buoc"),
  name: z.string().trim().min(1, "Ten chuc vu la bat buoc"),
  status: z.enum(["active", "inactive"]),
  is_manager: z.boolean(),
  description: z.string().trim().optional(),
})

const jobTitleSchema = z.object({
  code: z.string().trim().min(1, "Ma chuc danh la bat buoc"),
  name: z.string().trim().min(1, "Ten chuc danh la bat buoc"),
  description: z.string().trim().optional(),
})

const orgUnitSchema = z.object({
  code: z.string().trim().min(1, "Ma phong ban la bat buoc"),
  organization_id: z.string().trim().min(1, "Ma don vi la bat buoc"),
  name: z.string().trim().min(1, "Ten phong ban la bat buoc"),
  org_level: z.string().trim().min(1, "Cap to chuc la bat buoc"),
  parent_id: z.string().trim().optional(),
  department_type: z.string().trim().min(1, "Loai phong ban la bat buoc"),
  status: z.enum(["active", "inactive"]),
  description: z.string().trim().optional(),
})

const registrationSchema = z.object({
  registration_code: z.string().trim().min(1, "Mã hồ sơ là bắt buộc"),
  employee_code: z.string().trim().optional(),
  employee_type: z.string().trim().min(1, "Loại nhân viên là bắt buộc"),
  avatar_file_id: z.string().trim().optional(),
  org_unit_id: z.string().trim().min(1, "Mã đơn vị là bắt buộc"),
  full_name: z.string().trim().min(1, "Tên nhân viên là bắt buộc"),
  date_of_birth: z.string().trim().optional(),
  gender: z.string().trim().optional(),
  mobile: z.string().trim().optional(),
  email: z.string().trim().email("Email không hợp lệ").or(z.literal("")),
  marital_status: z.string().trim().optional(),
  address: z.string().trim().min(1, "Địa chỉ là bắt buộc"),
  permanent_address: z.string().trim().min(1, "Địa chỉ thường trú là bắt buộc"),
  identity_no: z.string().trim().min(1, "Số định danh là bắt buộc"),
  identity_issue_date: z.string().trim().optional(),
  identity_expiry_date: z.string().trim().optional(),
  identity_issue_place: z.string().trim().optional(),
  start_date: z.string().trim().optional(),
  official_date: z.string().trim().optional(),
  assignments: z.array(z.object({
    work_unit_id: z.string().trim().optional(),
    department_id: z.string().trim().optional(),
    position_id: z.string().trim().optional(),
    effective_date: z.string().trim().optional(),
    expiry_date: z.string().trim().optional(),
  })),
  educations: z.array(z.object({
    education_level: z.string().trim().optional(),
    training_type: z.string().trim().optional(),
    school: z.string().trim().optional(),
    major: z.string().trim().optional(),
    from_year: z.string().trim().optional(),
    to_year: z.string().trim().optional(),
  })),
  family_members: z.array(z.object({
    relationship: z.string().trim().optional(),
    full_name: z.string().trim().optional(),
    date_of_birth: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    address: z.string().trim().optional(),
    dependent: z.boolean(),
  })),
  delegations: z.array(z.object({
    employee_code: z.string().trim().optional(),
    employee_name: z.string().trim().optional(),
    department: z.string().trim().optional(),
    position: z.string().trim().optional(),
    decision_no: z.string().trim().optional(),
    content: z.string().trim().optional(),
    effective_date: z.string().trim().optional(),
    expiry_date: z.string().trim().optional(),
  })),
  attachments: z.array(z.object({
    document_type: z.string().trim().optional(),
    document_name: z.string().trim().optional(),
    file_name: z.string().trim().optional(),
    note: z.string().trim().optional(),
  })),
})

type PositionValues = z.infer<typeof positionSchema>
type JobTitleValues = z.infer<typeof jobTitleSchema>
type OrgUnitValues = z.infer<typeof orgUnitSchema>
type RegistrationValues = z.infer<typeof registrationSchema>

const positionDefaults: PositionValues = {
  code: "",
  name: "",
  status: "active",
  is_manager: false,
  description: "",
}

const jobTitleDefaults: JobTitleValues = {
  code: "",
  name: "",
  description: "",
}

const orgUnitDefaults: OrgUnitValues = {
  code: "",
  organization_id: "",
  name: "",
  org_level: "",
  parent_id: "",
  department_type: "",
  status: "active",
  description: "",
}

const registrationDefaults: RegistrationValues = {
  registration_code: nextRegistrationCode(),
  employee_code: "",
  employee_type: "EMPLOYEE",
  avatar_file_id: "",
  org_unit_id: "",
  full_name: "",
  date_of_birth: "",
  gender: "",
  mobile: "",
  email: "",
  marital_status: "",
  address: "",
  permanent_address: "",
  identity_no: "",
  identity_issue_date: "",
  identity_expiry_date: "",
  identity_issue_place: "Bộ Công an",
  start_date: "",
  official_date: "",
  assignments: [],
  educations: [],
  family_members: [],
  delegations: [],
  attachments: [],
}

export function PositionsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Position | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null)
  const positions = usePositions()
  const createPosition = useCreatePosition()
  const updatePosition = useUpdatePosition()
  const deletePosition = useDeletePosition()
  const form = useForm<PositionValues>({
    resolver: zodResolver(positionSchema),
    defaultValues: positionDefaults,
  })
  const isManager = useWatch({ control: form.control, name: "is_manager" })

  useEffect(() => {
    if (positions.error) notify.error("Khong the tai danh sach chuc vu")
  }, [positions.error])

  const openCreate = () => {
    setEditing(null)
    form.reset(positionDefaults)
    setDialogOpen(true)
  }

  const openEdit = (item: Position) => {
    setEditing(item)
    form.reset({
      code: item.code,
      name: item.name,
      status: item.status,
      is_manager: item.is_manager,
      description: item.description ?? "",
    })
    setDialogOpen(true)
  }

  const submit = form.handleSubmit(async (values) => {
    const payload = {
      ...values,
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
    }
    if (editing) {
      await updatePosition.mutateAsync({ id: editing.id, payload })
    } else {
      await createPosition.mutateAsync(payload)
    }
    setDialogOpen(false)
    form.reset(positionDefaults)
  })

  const items = positions.data ?? []
  return (
    <section className="space-y-4 p-4">
      <PageTitle title="Chuc vu" count={items.length} onCreate={openCreate} />
      <DataTable
        columns={["Ma chuc vu", "Ten chuc vu", "Trang thai", "Cap quan ly", "Mo ta"]}
        empty="Chua co chuc vu."
      >
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-xs">{item.code}</TableCell>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell><StatusBadge status={item.status} /></TableCell>
            <TableCell>{item.is_manager ? "Co" : "Khong"}</TableCell>
            <TableCell className="text-muted-foreground">{item.description || "-"}</TableCell>
            <RowActions onEdit={() => openEdit(item)} onDelete={() => setDeleteTarget(item)} />
          </TableRow>
        ))}
      </DataTable>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Sua chuc vu" : "Them chuc vu"}</DialogTitle>
            <DialogDescription>Ma va ten chuc vu la bat buoc.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <FormField label="Ma chuc vu (*)" error={form.formState.errors.code?.message}>
              <Input {...form.register("code")} placeholder="GIDO" />
            </FormField>
            <FormField label="Ten chuc vu (*)" error={form.formState.errors.name?.message}>
              <Input {...form.register("name")} placeholder="Giam doc" />
            </FormField>
            <FormField label="Trang thai (*)">
              <select className={fieldClass} {...form.register("status")}>
                <option value="active">Hieu luc</option>
                <option value="inactive">Khong hieu luc</option>
              </select>
            </FormField>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isManager}
                onCheckedChange={(value) => form.setValue("is_manager", Boolean(value))}
              />
              Co phai la cap quan ly
            </label>
            <FormField label="Mo ta">
              <Textarea {...form.register("description")} />
            </FormField>
            <DialogActions pending={form.formState.isSubmitting || createPosition.isPending || updatePosition.isPending} />
          </form>
        </DialogContent>
      </Dialog>
      <DeleteDialog
        title="Xoa chuc vu"
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          await deletePosition.mutateAsync(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </section>
  )
}

export function JobTitlesPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<JobTitle | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<JobTitle | null>(null)
  const jobTitles = useJobTitles()
  const createJobTitle = useCreateJobTitle()
  const updateJobTitle = useUpdateJobTitle()
  const deleteJobTitle = useDeleteJobTitle()
  const form = useForm<JobTitleValues>({
    resolver: zodResolver(jobTitleSchema),
    defaultValues: jobTitleDefaults,
  })
  const items = jobTitles.data ?? []

  const openCreate = () => {
    setEditing(null)
    form.reset(jobTitleDefaults)
    setDialogOpen(true)
  }

  const openEdit = (item: JobTitle) => {
    setEditing(item)
    form.reset({ code: item.code, name: item.name, description: item.description ?? "" })
    setDialogOpen(true)
  }

  const submit = form.handleSubmit(async (values) => {
    const payload = {
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
    }
    if (editing) {
      await updateJobTitle.mutateAsync({ id: editing.id, payload })
    } else {
      await createJobTitle.mutateAsync(payload)
    }
    setDialogOpen(false)
    form.reset(jobTitleDefaults)
  })

  return (
    <section className="space-y-4 p-4">
      <PageTitle title="Chuc danh" count={items.length} onCreate={openCreate} />
      <DataTable columns={["Ma chuc danh", "Ten chuc danh", "Mo ta"]} empty="Chua co chuc danh.">
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-xs">{item.code}</TableCell>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell className="text-muted-foreground">{item.description || "-"}</TableCell>
            <RowActions onEdit={() => openEdit(item)} onDelete={() => setDeleteTarget(item)} />
          </TableRow>
        ))}
      </DataTable>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Sua chuc danh" : "Them chuc danh"}</DialogTitle>
            <DialogDescription>Ma va ten chuc danh la bat buoc.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <FormField label="Ma chuc danh (*)" error={form.formState.errors.code?.message}>
              <Input {...form.register("code")} placeholder="KETO" />
            </FormField>
            <FormField label="Ten chuc danh (*)" error={form.formState.errors.name?.message}>
              <Input {...form.register("name")} placeholder="Ke toan" />
            </FormField>
            <FormField label="Mo ta">
              <Textarea {...form.register("description")} />
            </FormField>
            <DialogActions pending={form.formState.isSubmitting || createJobTitle.isPending || updateJobTitle.isPending} />
          </form>
        </DialogContent>
      </Dialog>
      <DeleteDialog
        title="Xoa chuc danh"
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          await deleteJobTitle.mutateAsync(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </section>
  )
}

export function OrgUnitsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<OrgUnit | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrgUnit | null>(null)
  const orgUnits = useOrgUnits()
  const organizations = useOrganizations()
  const createOrgUnit = useCreateOrgUnit()
  const updateOrgUnit = useUpdateOrgUnit()
  const deleteOrgUnit = useDeleteOrgUnit()
  const form = useForm<OrgUnitValues>({
    resolver: zodResolver(orgUnitSchema),
    defaultValues: orgUnitDefaults,
  })
  const items = orgUnits.data ?? []
  const orgs = organizations.data ?? []

  const orgName = (id: string) => {
    const org = orgs.find((item) => item.id === id)
    return org ? `${org.code} - ${org.name}` : id
  }
  const parentName = (id?: string) => items.find((item) => item.id === id)?.name ?? "-"

  const openCreate = () => {
    setEditing(null)
    form.reset(orgUnitDefaults)
    setDialogOpen(true)
  }

  const openEdit = (item: OrgUnit) => {
    setEditing(item)
    form.reset({
      code: item.code,
      organization_id: item.organization_id,
      name: item.name,
      org_level: item.org_level,
      parent_id: item.parent_id ?? "",
      department_type: item.department_type,
      status: item.status,
      description: item.description ?? "",
    })
    setDialogOpen(true)
  }

  const submit = form.handleSubmit(async (values) => {
    const payload = {
      ...values,
      code: values.code.trim(),
      name: values.name.trim(),
      parent_id: values.parent_id || undefined,
      description: values.description?.trim() || undefined,
    }
    if (editing) {
      await updateOrgUnit.mutateAsync({ id: editing.id, payload })
    } else {
      await createOrgUnit.mutateAsync(payload)
    }
    setDialogOpen(false)
    form.reset(orgUnitDefaults)
  })

  return (
    <section className="space-y-4 p-4">
      <PageTitle title="Co cau to chuc" count={items.length} onCreate={openCreate} />
      <DataTable
        columns={["Ma phong ban", "Ten phong ban", "Don vi", "Cap", "Cap cha", "Loai", "Trang thai"]}
        empty="Chua co phong ban."
      >
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-xs">{item.code}</TableCell>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell>{orgName(item.organization_id)}</TableCell>
            <TableCell>{item.org_level}</TableCell>
            <TableCell>{parentName(item.parent_id)}</TableCell>
            <TableCell>{item.department_type}</TableCell>
            <TableCell><StatusBadge status={item.status} /></TableCell>
            <RowActions onEdit={() => openEdit(item)} onDelete={() => setDeleteTarget(item)} />
          </TableRow>
        ))}
      </DataTable>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Sua phong ban" : "Them phong ban"}</DialogTitle>
            <DialogDescription>Ma don vi lay tu platform.organizations.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <FormField label="Ma phong ban (*)" error={form.formState.errors.code?.message}>
              <Input {...form.register("code")} />
            </FormField>
            <FormField label="Ma don vi (*)" error={form.formState.errors.organization_id?.message}>
              <select className={fieldClass} {...form.register("organization_id")}>
                <option value="">Chon don vi</option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.code} - {org.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Ten phong ban (*)" error={form.formState.errors.name?.message}>
              <Input {...form.register("name")} />
            </FormField>
            <FormField label="Cap to chuc (*)" error={form.formState.errors.org_level?.message}>
              <Input {...form.register("org_level")} placeholder="HOI_SO, PHONG, TO" />
            </FormField>
            <FormField label="Ma cap cha">
              <select className={fieldClass} {...form.register("parent_id")}>
                <option value="">Khong co</option>
                {items
                  .filter((item) => item.id !== editing?.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} - {item.name}
                    </option>
                  ))}
              </select>
            </FormField>
            <FormField label="Loai phong ban (*)" error={form.formState.errors.department_type?.message}>
              <Input {...form.register("department_type")} placeholder="PHONG_BAN" />
            </FormField>
            <FormField label="Trang thai (*)">
              <select className={fieldClass} {...form.register("status")}>
                <option value="active">Hieu luc</option>
                <option value="inactive">Khong hieu luc</option>
              </select>
            </FormField>
            <FormField label="Mo ta">
              <Textarea {...form.register("description")} />
            </FormField>
            <DialogActions pending={form.formState.isSubmitting || createOrgUnit.isPending || updateOrgUnit.isPending} />
          </form>
        </DialogContent>
      </Dialog>
      <DeleteDialog
        title="Xoa phong ban"
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          await deleteOrgUnit.mutateAsync(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </section>
  )
}

export function RegistrationsPage() {
  const [savedRegistration, setSavedRegistration] = useState<EmployeeRegistration | null>(null)
  const orgUnits = useOrgUnits()
  const positions = usePositions()
  const createRegistration = useCreateEmployeeRegistration()
  const submitRegistration = useSubmitEmployeeRegistration()
  const uploadAvatar = useUploadEmployeeAvatar()
  const form = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { ...registrationDefaults, registration_code: nextRegistrationCode() },
  })
  const avatarFileId = useWatch({ control: form.control, name: "avatar_file_id" })

  const resetDraft = () => {
    setSavedRegistration(null)
    form.reset({ ...registrationDefaults, registration_code: nextRegistrationCode() })
  }

  async function save(values: RegistrationValues, submitNow = false) {
    let current = savedRegistration
    if (!current) {
      current = await createRegistration.mutateAsync({
        registration_code: values.registration_code.trim(),
        payload: toRegistrationPayload(values),
      })
      setSavedRegistration(current)
      form.reset(values)
    }
    if (submitNow && current.status === "draft") {
      const submitted = await submitRegistration.mutateAsync(current.id)
      setSavedRegistration(submitted)
    }
  }

  async function uploadAvatarFile(file: File) {
    const registrationCode = form.getValues("registration_code").trim()
    if (!registrationCode) {
      notify.error("Nhập mã hồ sơ trước khi upload ảnh đại diện")
      return
    }
    if (!file.type.startsWith("image/")) {
      notify.error("File ảnh không hợp lệ")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      notify.error("Ảnh đại diện tối đa 5MB")
      return
    }
    const result = await uploadAvatar.mutateAsync({ file, registrationCode })
    form.setValue("avatar_file_id", result.public_id, { shouldDirty: true })
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit((values) => save(values))}>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-gutter:stable]">
          <Tabs defaultValue="general" className="space-y-4">
            <CollapsingPageTitle
              title="Đăng ký nhân sự"
              description="Nhập hồ sơ nhân sự và trình duyệt theo quy trình BPM HRM_EMPLOYEE_REGISTRATION."
              collapsedContent={<RegistrationTabsList compact />}
              meta={
                <>
                  {savedRegistration ? (
                    <Badge className="shrink-0" variant="secondary">
                      {registrationStatusLabel(savedRegistration.status)}
                    </Badge>
                  ) : null}
                  {savedRegistration?.workflow_case_id ? (
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      Workflow case: {savedRegistration.workflow_case_id}
                    </span>
                  ) : null}
                </>
              }
              actions={
                savedRegistration ? (
                  <Button className="h-8" type="button" variant="outline" onClick={resetDraft}>
                    <Plus className="size-4" />
                    Hồ sơ mới
                  </Button>
                ) : null
              }
            >
              <RegistrationTabsList />
            </CollapsingPageTitle>
            <TabsContent value="general" className="mt-0 space-y-4">
              <RegistrationGeneralPanel
                avatarFileId={avatarFileId ?? ""}
                form={form}
                orgUnits={orgUnits.data ?? []}
                uploadingAvatar={uploadAvatar.isPending}
                onClearAvatar={() => form.setValue("avatar_file_id", "", { shouldDirty: true })}
                onUploadAvatar={uploadAvatarFile}
              />
              <AssignmentsTable form={form} orgUnits={orgUnits.data ?? []} positions={positions.data ?? []} />
              <EducationsTable form={form} />
            </TabsContent>
            <TabsContent value="family" className="mt-0">
              <FamilyTable form={form} />
            </TabsContent>
            <TabsContent value="delegation" className="mt-0">
              <DelegationsTable form={form} />
            </TabsContent>
            <TabsContent value="attachments" className="mt-0">
              <AttachmentsTable form={form} />
            </TabsContent>
          </Tabs>
        </div>
        <div className="flex h-[52px] shrink-0 items-center border-t bg-background px-4">
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button
              className="h-8"
              type="submit"
              disabled={
                Boolean(savedRegistration) ||
                form.formState.isSubmitting ||
                createRegistration.isPending
              }
            >
              Lưu nháp
            </Button>
            <Button
              className="h-8"
              type="button"
              variant="secondary"
              disabled={
                (savedRegistration?.status !== undefined && savedRegistration.status !== "draft") ||
                form.formState.isSubmitting ||
                createRegistration.isPending ||
                submitRegistration.isPending
              }
              onClick={form.handleSubmit((values) => save(values, true))}
            >
              <Send className="size-4" />
              {savedRegistration ? "Gửi BPM" : "Trình duyệt"}
            </Button>
          </div>
        </div>
      </form>
    </section>
  )
}

function RegistrationTabsList({ compact = false }: { compact?: boolean }) {
  return (
    <TabsList
      className={cn(
        "flex h-auto justify-start",
        compact
          ? "max-w-full flex-nowrap overflow-x-auto scrollbar-none"
          : "flex-wrap"
      )}
    >
      <TabsTrigger value="general">Thông tin chung</TabsTrigger>
      <TabsTrigger value="family">Gia đình</TabsTrigger>
      <TabsTrigger value="delegation">Ủy quyền</TabsTrigger>
      <TabsTrigger value="attachments">Hồ sơ tài liệu</TabsTrigger>
    </TabsList>
  )
}

function RegistrationGeneralPanel({
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
  return (
    <section className="space-y-3 rounded-md border p-4">
      <h2 className="text-sm font-semibold">Thông tin chung</h2>
      <div className="grid gap-4 xl:grid-cols-[1fr_220px]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="Mã hồ sơ BPM (*)" error={form.formState.errors.registration_code?.message}>
            <Input {...form.register("registration_code")} />
          </FormField>
          <FormField label="Mã nhân viên">
            <Input {...form.register("employee_code")} />
          </FormField>
          <FormField label="Loại nhân viên (*)" error={form.formState.errors.employee_type?.message}>
            <select className={fieldClass} {...form.register("employee_type")}>
              <option value="EMPLOYEE">Nhân viên</option>
              <option value="COLLABORATOR">Cộng tác viên</option>
              <option value="INTERN">Thực tập sinh</option>
            </select>
          </FormField>
          <FormField label="Mã đơn vị (*)" error={form.formState.errors.org_unit_id?.message}>
            <select className={fieldClass} {...form.register("org_unit_id")}>
              <option value="">Chọn đơn vị</option>
              {orgUnits.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Tên nhân viên (*)" error={form.formState.errors.full_name?.message}>
            <Input {...form.register("full_name")} />
          </FormField>
          <FormField label="Ngày sinh">
            <Input {...form.register("date_of_birth")} placeholder="dd/MM/yyyy" />
          </FormField>
          <FormField label="Giới tính">
            <select className={fieldClass} {...form.register("gender")}>
              <option value="">Chọn giới tính</option>
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
              <option value="OTHER">Khác</option>
            </select>
          </FormField>
          <FormField label="Số di động">
            <Input {...form.register("mobile")} />
          </FormField>
          <FormField label="Email" error={form.formState.errors.email?.message}>
            <Input {...form.register("email")} />
          </FormField>
          <FormField label="Tình trạng hôn nhân">
            <select className={fieldClass} {...form.register("marital_status")}>
              <option value="">Chọn tình trạng</option>
              <option value="SINGLE">Độc thân</option>
              <option value="MARRIED">Đã kết hôn</option>
              <option value="OTHER">Khác</option>
            </select>
          </FormField>
          <FormField label="Số định danh (*)" error={form.formState.errors.identity_no?.message}>
            <Input {...form.register("identity_no")} />
          </FormField>
          <FormField label="Nơi cấp">
            <Input {...form.register("identity_issue_place")} />
          </FormField>
          <FormField label="Ngày cấp">
            <Input {...form.register("identity_issue_date")} placeholder="dd/MM/yyyy" />
          </FormField>
          <FormField label="Ngày hết hiệu lực">
            <Input {...form.register("identity_expiry_date")} placeholder="dd/MM/yyyy" />
          </FormField>
          <FormField label="Ngày vào làm việc">
            <Input {...form.register("start_date")} placeholder="dd/MM/yyyy" />
          </FormField>
          <FormField label="Ngày chính thức">
            <Input {...form.register("official_date")} placeholder="dd/MM/yyyy" />
          </FormField>
          <FormField label="Địa chỉ (*)" className="xl:col-span-2" error={form.formState.errors.address?.message}>
            <Input {...form.register("address")} />
          </FormField>
          <FormField label="Địa chỉ thường trú (*)" className="xl:col-span-2" error={form.formState.errors.permanent_address?.message}>
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

function EmployeeAvatarUploader({
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
  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    await onUpload(file)
    event.target.value = ""
  }

  return (
    <div className="space-y-2">
      <div className="flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-md border bg-muted/30">
        {fileId ? (
          <img
            alt="Ảnh đại diện nhân sự"
            className="h-full w-full object-cover"
            src={getMediaContentUrl(fileId)}
          />
        ) : (
          <div className="px-4 text-center text-sm text-muted-foreground">
            Ảnh đại diện
          </div>
        )}
      </div>
      <label className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted">
        <Upload className="size-4" />
        {uploading ? "Đang tải" : "Upload"}
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
          Xóa ảnh
        </Button>
      ) : null}
    </div>
  )
}

function AssignmentsTable({
  form,
  orgUnits,
  positions,
}: {
  form: UseFormReturn<RegistrationValues>
  orgUnits: OrgUnit[]
  positions: Position[]
}) {
  const rows = useFieldArray({ control: form.control, name: "assignments" })
  return (
    <InlineEditTable
      title="Thông tin chức vụ"
      columns={["STT", "Đơn vị làm việc", "Phòng ban", "Chức vụ", "Ngày hiệu lực", "Ngày hết hiệu lực"]}
      onAdd={() => rows.append({ work_unit_id: "", department_id: "", position_id: "", effective_date: "", expiry_date: "" })}
      empty="Chưa có dòng chức vụ."
    >
      {rows.fields.map((row, index) => (
        <TableRow key={row.id}>
          <TableCell className="w-12 text-muted-foreground">{index + 1}</TableCell>
          <TableCell>
            <select className={fieldClass} {...form.register(`assignments.${index}.work_unit_id`)}>
              <option value="">Chọn đơn vị</option>
              {orgUnits.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}
            </select>
          </TableCell>
          <TableCell>
            <select className={fieldClass} {...form.register(`assignments.${index}.department_id`)}>
              <option value="">Chọn phòng ban</option>
              {orgUnits.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}
            </select>
          </TableCell>
          <TableCell>
            <select className={fieldClass} {...form.register(`assignments.${index}.position_id`)}>
              <option value="">Chọn chức vụ</option>
              {positions.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}
            </select>
          </TableCell>
          <TableCell><Input {...form.register(`assignments.${index}.effective_date`)} placeholder="dd/MM/yyyy" /></TableCell>
          <TableCell><Input {...form.register(`assignments.${index}.expiry_date`)} placeholder="dd/MM/yyyy" /></TableCell>
          <InlineRowActions onDelete={() => rows.remove(index)} />
        </TableRow>
      ))}
    </InlineEditTable>
  )
}

function EducationsTable({ form }: { form: UseFormReturn<RegistrationValues> }) {
  const rows = useFieldArray({ control: form.control, name: "educations" })
  return (
    <InlineEditTable
      title="Thông tin trình độ học vấn"
      columns={["TT", "Cấp đào tạo", "Loại hình đào tạo", "Trường đào tạo", "Chuyên ngành", "Từ năm", "Đến năm"]}
      onAdd={() => rows.append({ education_level: "", training_type: "", school: "", major: "", from_year: "", to_year: "" })}
      empty="Chưa có dòng trình độ học vấn."
    >
      {rows.fields.map((row, index) => (
        <TableRow key={row.id}>
          <TableCell className="w-12 text-muted-foreground">{index + 1}</TableCell>
          <TableCell><Input {...form.register(`educations.${index}.education_level`)} /></TableCell>
          <TableCell><Input {...form.register(`educations.${index}.training_type`)} /></TableCell>
          <TableCell><Input {...form.register(`educations.${index}.school`)} /></TableCell>
          <TableCell><Input {...form.register(`educations.${index}.major`)} /></TableCell>
          <TableCell><Input {...form.register(`educations.${index}.from_year`)} /></TableCell>
          <TableCell><Input {...form.register(`educations.${index}.to_year`)} /></TableCell>
          <InlineRowActions onDelete={() => rows.remove(index)} />
        </TableRow>
      ))}
    </InlineEditTable>
  )
}

function FamilyTable({ form }: { form: UseFormReturn<RegistrationValues> }) {
  const rows = useFieldArray({ control: form.control, name: "family_members" })
  const familyMembers = useWatch({ control: form.control, name: "family_members" })
  return (
    <InlineEditTable
      title="Thông tin gia đình & người phụ thuộc"
      columns={["TT", "Quan hệ", "Họ tên", "Ngày sinh", "Số điện thoại", "Địa chỉ", "Người phụ thuộc"]}
      onAdd={() => rows.append({ relationship: "", full_name: "", date_of_birth: "", phone: "", address: "", dependent: false })}
      empty="Chưa có thông tin gia đình."
    >
      {rows.fields.map((row, index) => (
        <TableRow key={row.id}>
          <TableCell className="w-12 text-muted-foreground">{index + 1}</TableCell>
          <TableCell><Input {...form.register(`family_members.${index}.relationship`)} /></TableCell>
          <TableCell><Input {...form.register(`family_members.${index}.full_name`)} /></TableCell>
          <TableCell><Input {...form.register(`family_members.${index}.date_of_birth`)} placeholder="dd/MM/yyyy" /></TableCell>
          <TableCell><Input {...form.register(`family_members.${index}.phone`)} /></TableCell>
          <TableCell><Input {...form.register(`family_members.${index}.address`)} /></TableCell>
          <TableCell>
            <Checkbox
              checked={familyMembers?.[index]?.dependent ?? false}
              onCheckedChange={(value) => form.setValue(`family_members.${index}.dependent`, Boolean(value), { shouldDirty: true })}
            />
          </TableCell>
          <InlineRowActions onDelete={() => rows.remove(index)} />
        </TableRow>
      ))}
    </InlineEditTable>
  )
}

function DelegationsTable({ form }: { form: UseFormReturn<RegistrationValues> }) {
  const rows = useFieldArray({ control: form.control, name: "delegations" })
  return (
    <InlineEditTable
      title="Thông tin nhân sự nhận ủy quyền"
      columns={["TT", "Mã nhân viên nhận ủy quyền", "Tên nhân viên", "Phòng ban", "Chức vụ", "Quyết định số", "Nội dung", "Ngày hiệu lực", "Ngày hết hiệu lực"]}
      onAdd={() => rows.append({ employee_code: "", employee_name: "", department: "", position: "", decision_no: "", content: "", effective_date: "", expiry_date: "" })}
      empty="Chưa có thông tin ủy quyền."
    >
      {rows.fields.map((row, index) => (
        <TableRow key={row.id}>
          <TableCell className="w-12 text-muted-foreground">{index + 1}</TableCell>
          <TableCell><Input {...form.register(`delegations.${index}.employee_code`)} /></TableCell>
          <TableCell><Input {...form.register(`delegations.${index}.employee_name`)} /></TableCell>
          <TableCell><Input {...form.register(`delegations.${index}.department`)} /></TableCell>
          <TableCell><Input {...form.register(`delegations.${index}.position`)} /></TableCell>
          <TableCell><Input {...form.register(`delegations.${index}.decision_no`)} /></TableCell>
          <TableCell><Input {...form.register(`delegations.${index}.content`)} /></TableCell>
          <TableCell><Input {...form.register(`delegations.${index}.effective_date`)} placeholder="dd/MM/yyyy" /></TableCell>
          <TableCell><Input {...form.register(`delegations.${index}.expiry_date`)} placeholder="dd/MM/yyyy" /></TableCell>
          <InlineRowActions onDelete={() => rows.remove(index)} />
        </TableRow>
      ))}
    </InlineEditTable>
  )
}

function AttachmentsTable({ form }: { form: UseFormReturn<RegistrationValues> }) {
  const rows = useFieldArray({ control: form.control, name: "attachments" })
  return (
    <InlineEditTable
      title="Hồ sơ tài liệu đính kèm"
      columns={["TT", "Loại tài liệu", "Tên tài liệu", "Tệp/Media ID", "Ghi chú"]}
      onAdd={() => rows.append({ document_type: "", document_name: "", file_name: "", note: "" })}
      empty="Chưa có tài liệu đính kèm."
    >
      {rows.fields.map((row, index) => (
        <TableRow key={row.id}>
          <TableCell className="w-12 text-muted-foreground">{index + 1}</TableCell>
          <TableCell><Input {...form.register(`attachments.${index}.document_type`)} /></TableCell>
          <TableCell><Input {...form.register(`attachments.${index}.document_name`)} /></TableCell>
          <TableCell><Input {...form.register(`attachments.${index}.file_name`)} /></TableCell>
          <TableCell><Input {...form.register(`attachments.${index}.note`)} /></TableCell>
          <InlineRowActions onDelete={() => rows.remove(index)} />
        </TableRow>
      ))}
    </InlineEditTable>
  )
}

function InlineEditTable({
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
  const rows = Array.isArray(children) ? children : [children]
  const hasRows = rows.some(Boolean)
  return (
    <section className="space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="size-4" />
          Thêm dòng
        </Button>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
              <TableHead className="w-16 text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasRows ? children : (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="h-20 text-center text-muted-foreground">
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

function InlineRowActions({ onDelete }: { onDelete: () => void }) {
  return (
    <TableCell className="text-right">
      <Button type="button" size="icon" variant="ghost" className="size-8 text-destructive" onClick={onDelete}>
        <Trash2 className="size-4" />
      </Button>
    </TableCell>
  )
}

function toRegistrationPayload(values: RegistrationValues): Record<string, unknown> {
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

function compactRows<T extends Record<string, unknown>>(rows: T[]) {
  return rows.filter((row) =>
    Object.values(row).some((value) =>
      typeof value === "boolean" ? value : String(value ?? "").trim() !== ""
    )
  )
}

function textOrUndefined(value: string | undefined) {
  const text = value?.trim()
  return text || undefined
}

function nextRegistrationCode() {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replaceAll("-", "")
  const time = now.toTimeString().slice(0, 8).replaceAll(":", "")
  return `HRM-${date}-${time}`
}

function registrationStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Nháp"
    case "submitted":
      return "Đã trình"
    case "approved":
      return "Đã duyệt"
    case "rejected":
      return "Từ chối"
    default:
      return status
  }
}

export function EmployeesPage() {
  const employees = useEmployees()
  const orgUnits = useOrgUnits()
  const positions = usePositions()
  const jobTitles = useJobTitles()
  const itemMap = useMemo(
    () => ({
      orgUnits: new Map((orgUnits.data ?? []).map((item) => [item.id, item.name])),
      positions: new Map((positions.data ?? []).map((item) => [item.id, item.name])),
      jobTitles: new Map((jobTitles.data ?? []).map((item) => [item.id, item.name])),
    }),
    [jobTitles.data, orgUnits.data, positions.data]
  )
  const items = employees.data ?? []

  return (
    <section className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Thong tin nhan su</h1>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      <DataTable columns={["Ma nhan su", "Ho ten", "Phong ban", "Chuc vu", "Chuc danh", "Trang thai"]} empty="Chua co nhan su.">
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-xs">{item.employee_code}</TableCell>
            <TableCell className="font-medium">{item.full_name}</TableCell>
            <TableCell>{item.org_unit_id ? itemMap.orgUnits.get(item.org_unit_id) ?? item.org_unit_id : "-"}</TableCell>
            <TableCell>{item.position_id ? itemMap.positions.get(item.position_id) ?? item.position_id : "-"}</TableCell>
            <TableCell>{item.job_title_id ? itemMap.jobTitles.get(item.job_title_id) ?? item.job_title_id : "-"}</TableCell>
            <TableCell><StatusBadge status={item.status} /></TableCell>
            <TableCell />
          </TableRow>
        ))}
      </DataTable>
    </section>
  )
}

function PageTitle({ title, count, onCreate }: { title: string; count: number; onCreate: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <Button onClick={onCreate}>
        <Plus className="mr-1 size-4" /> Thêm
      </Button>
    </div>
  )
}

function DataTable({
  children,
  columns,
  empty,
}: {
  children: ReactNode
  columns: string[]
  empty: string
}) {
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
            <TableHead className="w-24 text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hasRows ? (
            children
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="h-24 text-center text-muted-foreground">
                {empty}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <TableCell className="text-right">
      <div className="flex justify-end gap-1">
        <Button size="icon" variant="ghost" className="size-8" onClick={onEdit}>
          <Edit2 className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={onDelete}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </TableCell>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === "active" ? "default" : "secondary"}>
      {status === "active" ? "Hieu luc" : "Khong hieu luc"}
    </Badge>
  )
}

function DialogActions({ pending }: { pending: boolean }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="submit" disabled={pending}>
        Luu
      </Button>
    </div>
  )
}

function DeleteDialog({
  title,
  open,
  onOpenChange,
  onConfirm,
}: {
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>Thao tac nay khong the hoan tac.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Huy</AlertDialogCancel>
          <AlertDialogAction onClick={() => void onConfirm()}>Xoa</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
