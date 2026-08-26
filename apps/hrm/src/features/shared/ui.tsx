import type { ChangeEvent, ReactNode } from "react"
import type { UseFormReturn } from "react-hook-form"
import { useFieldArray } from "react-hook-form"
import { getMediaContentUrl } from "@workspace/media"
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
  return (
    <TabsList
      className={cn(
        "flex h-auto justify-start",
        compact
          ? "scrollbar-none max-w-full flex-nowrap overflow-x-auto"
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
  return (
    <section className="space-y-3 rounded-md border p-4">
      <h2 className="text-sm font-semibold">Thông tin chung</h2>
      <div className="grid gap-4 xl:grid-cols-[1fr_220px]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="Mã nhân viên">
            <Input {...form.register("employee_code")} />
          </FormField>
          <FormField
            label="Loại nhân viên (*)"
            error={form.formState.errors.employee_type?.message}
          >
            <select className={fieldClass} {...form.register("employee_type")}>
              <option value="EMPLOYEE">Nhân viên</option>
              <option value="COLLABORATOR">Cộng tác viên</option>
              <option value="INTERN">Thực tập sinh</option>
            </select>
          </FormField>
          <FormField
            label="Mã đơn vị (*)"
            error={form.formState.errors.org_unit_id?.message}
          >
            <select className={fieldClass} {...form.register("org_unit_id")}>
              <option value="">Chọn đơn vị</option>
              {orgUnits.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Tên nhân viên (*)"
            error={form.formState.errors.full_name?.message}
          >
            <Input {...form.register("full_name")} />
          </FormField>
          <FormField label="Ngày sinh">
            <Input
              {...form.register("date_of_birth")}
              placeholder="dd/MM/yyyy"
            />
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
          <FormField
            label="Số định danh (*)"
            error={form.formState.errors.identity_no?.message}
          >
            <Input {...form.register("identity_no")} />
          </FormField>
          <FormField label="Nơi cấp">
            <Input {...form.register("identity_issue_place")} />
          </FormField>
          <FormField label="Ngày cấp">
            <Input
              {...form.register("identity_issue_date")}
              placeholder="dd/MM/yyyy"
            />
          </FormField>
          <FormField label="Ngày hết hiệu lực">
            <Input
              {...form.register("identity_expiry_date")}
              placeholder="dd/MM/yyyy"
            />
          </FormField>
          <FormField label="Ngày vào làm việc">
            <Input {...form.register("start_date")} placeholder="dd/MM/yyyy" />
          </FormField>
          <FormField label="Ngày chính thức">
            <Input
              {...form.register("official_date")}
              placeholder="dd/MM/yyyy"
            />
          </FormField>
          <FormField
            label="Địa chỉ (*)"
            className="xl:col-span-2"
            error={form.formState.errors.address?.message}
          >
            <Input {...form.register("address")} />
          </FormField>
          <FormField
            label="Địa chỉ thường trú (*)"
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
  return (
    <InlineEditTable
      title="Thông tin chức vụ"
      columns={[
        "STT",
        "Đơn vị làm việc",
        "Phòng ban",
        "Chức vụ",
        "Ngày hiệu lực",
        "Ngày hết hiệu lực",
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
      empty="Chưa có dòng chức vụ."
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
              <option value="">Chọn đơn vị</option>
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
              <option value="">Chọn phòng ban</option>
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
              <option value="">Chọn chức vụ</option>
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
  return (
    <InlineEditTable
      title="Thông tin trình độ học vấn"
      columns={[
        "TT",
        "Cấp đào tạo",
        "Loại hình đào tạo",
        "Trường đào tạo",
        "Chuyên ngành",
        "Từ năm",
        "Đến năm",
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
      empty="Chưa có dòng trình độ học vấn."
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
  return (
    <InlineEditTable
      title="Thông tin gia đình & người phụ thuộc"
      columns={[
        "TT",
        "Quan hệ",
        "Họ tên",
        "Ngày sinh",
        "Số điện thoại",
        "Địa chỉ",
        "Người phụ thuộc",
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
      empty="Chưa có thông tin gia đình."
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
  return (
    <InlineEditTable
      title="Thông tin nhân sự nhận ủy quyền"
      columns={[
        "TT",
        "Mã nhân viên nhận ủy quyền",
        "Tên nhân viên",
        "Phòng ban",
        "Chức vụ",
        "Quyết định số",
        "Nội dung",
        "Ngày hiệu lực",
        "Ngày hết hiệu lực",
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
      empty="Chưa có thông tin ủy quyền."
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
  return (
    <InlineEditTable
      title="Hồ sơ tài liệu đính kèm"
      columns={[
        "TT",
        "Loại tài liệu",
        "Tên tài liệu",
        "Tệp/Media ID",
        "Ghi chú",
      ]}
      onAdd={() =>
        rows.append({
          document_type: "",
          document_name: "",
          file_name: "",
          note: "",
        })
      }
      empty="Chưa có tài liệu đính kèm."
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
  if (!registration?.registration_code) return null
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-4 py-3 text-sm">
      <span>
        Mã hồ sơ:{" "}
        <span className="font-mono font-medium">
          {registration.registration_code}
        </span>
      </span>
      {registration.workflow_case_id ? (
        <span className="text-muted-foreground">
          Case BPM:{" "}
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

export function registrationStatusLabel(status: string) {
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
export function PageTitle({
  title,
  count,
  onCreate,
}: {
  title: string
  count: number
  onCreate: () => void
}) {
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

export function DataTable({
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
  return (
    <Badge variant={status === "active" ? "default" : "secondary"}>
      {status === "active" ? "Hieu luc" : "Khong hieu luc"}
    </Badge>
  )
}

export function DialogActions({ pending }: { pending: boolean }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="submit" disabled={pending}>
        Luu
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
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            Thao tac nay khong the hoan tac.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Huy</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() => void onConfirm()}
          >
            {pending ? "Dang xoa..." : "Xoa"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
