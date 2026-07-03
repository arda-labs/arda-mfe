import { useEffect, useState, type ChangeEvent, type ReactNode } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { getMediaContentUrl } from "@workspace/media"
import { notify } from "@workspace/notifications/notify"
import { FileText, Plus, Save, Search, Send, Upload } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Textarea } from "@workspace/ui/components/textarea"
import type { Customer, CustomerType, WorkflowTaskRole } from "./api"
import {
  useCompleteWorkflowTask,
  useCustomer,
  useCreateCustomerRelationship,
  useCustomerRelationships,
  useCustomers,
  useSaveCustomer,
  useSubmitCustomer,
  useCustomerDrafts,
  useUploadCustomerAvatar,
  useWorkflowTasks,
} from "./queries"

type CustomerRoute = "registrations" | "profiles" | "risk"
type WorkbenchRoute = "drafts" | "tasks"

const customerSchema = z.object({
  id: z.string().trim().min(1, "Mã khách hàng là bắt buộc"),
  customerType: z.enum(["PERSONAL", "BUSINESS"]),
  avatarFileId: z.string().trim(),
  orgUnit: z.string().trim(),
  name: z.string().trim().min(1, "Tên khách hàng là bắt buộc"),
  provinceCode: z.string().trim(),
  wardCode: z.string().trim(),
  areaCode: z.string().trim(),
  permanentAddress: z.string().trim(),
  currentAddress: z.string().trim(),
  mobile: z.string().trim(),
  fixedPhone: z.string().trim(),
  email: z.string().trim().email("Email không hợp lệ").or(z.literal("")),
  taxCode: z.string().trim(),
  fax: z.string().trim(),
  economicType: z.string().trim(),
  economicSector: z.string().trim(),
  bankAccount: z.string().trim(),
  bankName: z.string().trim(),
  gender: z.string().trim(),
  dateOfBirth: z.string().trim(),
  ethnicity: z.string().trim(),
  maritalStatus: z.string().trim(),
  birthPlace: z.string().trim(),
  occupation: z.string().trim(),
  educationLevel: z.string().trim(),
  cultureLevel: z.string().trim(),
  identityType: z.string().trim(),
  identityNo: z.string().trim(),
  oldIdentityNo: z.string().trim(),
  identityIssueDate: z.string().trim(),
  identityExpiryDate: z.string().trim(),
  identityIssuePlace: z.string().trim(),
  segment: z.string().trim(),
  riskLevel: z.string().trim(),
  rank: z.string().trim(),
  memberCardNo: z.string().trim(),
  memberCardIssueDate: z.string().trim(),
  memberCardIssuePlace: z.string().trim(),
  extendedOccupation: z.string().trim(),
  jobTitle: z.string().trim(),
  workDuration: z.string().trim(),
  laborContractType: z.string().trim(),
  workplace: z.string().trim(),
  workplaceAddress: z.string().trim(),
  note: z.string().trim(),
  shortName: z.string().trim(),
  businessRegistrationNo: z.string().trim(),
  businessIssueDate: z.string().trim(),
  issuingAuthority: z.string().trim(),
  establishedDate: z.string().trim(),
  website: z.string().trim(),
  representative: z.string().trim(),
  representativeTitle: z.string().trim(),
  representativeIdentityNo: z.string().trim(),
  businessLine: z.string().trim(),
})

type CustomerFormValues = z.infer<typeof customerSchema>

const relationshipSchema = z.object({
  relatedCustomerId: z.string().trim().min(1, "Mã khách hàng là bắt buộc"),
  relationType: z.string().trim().min(1, "Loại quan hệ là bắt buộc"),
  relationCode: z.string().trim().min(1, "Mã quan hệ là bắt buộc"),
  reciprocalRelationCode: z.string().trim().min(1, "Mã QH đối ứng là bắt buộc"),
  status: z.string().trim().min(1, "Trạng thái quan hệ là bắt buộc"),
})

type RelationshipFormValues = z.infer<typeof relationshipSchema>

const defaultValues: CustomerFormValues = {
  id: "",
  customerType: "PERSONAL",
  avatarFileId: "",
  orgUnit: "",
  name: "",
  provinceCode: "",
  wardCode: "",
  areaCode: "",
  permanentAddress: "",
  currentAddress: "",
  mobile: "",
  fixedPhone: "",
  email: "",
  taxCode: "",
  fax: "",
  economicType: "",
  economicSector: "",
  bankAccount: "",
  bankName: "",
  gender: "Nam",
  dateOfBirth: "",
  ethnicity: "Kinh",
  maritalStatus: "Đã lập gia đình",
  birthPlace: "",
  occupation: "",
  educationLevel: "",
  cultureLevel: "",
  identityType: "Căn cước công dân",
  identityNo: "",
  oldIdentityNo: "",
  identityIssueDate: "",
  identityExpiryDate: "",
  identityIssuePlace: "",
  segment: "",
  riskLevel: "",
  rank: "",
  memberCardNo: "",
  memberCardIssueDate: "",
  memberCardIssuePlace: "",
  extendedOccupation: "",
  jobTitle: "",
  workDuration: "",
  laborContractType: "",
  workplace: "",
  workplaceAddress: "",
  note: "",
  shortName: "",
  businessRegistrationNo: "",
  businessIssueDate: "",
  issuingAuthority: "",
  establishedDate: "",
  website: "",
  representative: "",
  representativeTitle: "",
  representativeIdentityNo: "",
  businessLine: "",
}

const selectOptions = {
  customerType: [
    { value: "PERSONAL", label: "Khách hàng cá nhân" },
    { value: "BUSINESS", label: "Doanh nghiệp" },
  ],
  province: [{ value: "none", label: "-- Chọn Tỉnh, Thành phố --" }],
  ward: [{ value: "none", label: "-- Chọn Phường/Xã --" }],
  area: [{ value: "none", label: "-- Chọn khu vực --" }],
  generic: [{ value: "none", label: "-- Chọn --" }],
  relation: [
    { value: "SPOUSE", label: "Vợ/Chồng" },
    { value: "PARENT", label: "Cha/Mẹ" },
    { value: "CHILD", label: "Con" },
    { value: "GUARANTOR", label: "Người bảo lãnh" },
  ],
  status: [
    { value: "ACTIVE", label: "Hoạt động" },
    { value: "INACTIVE", label: "Ngừng hiệu lực" },
  ],
}

const generalFields: Array<
  [keyof CustomerFormValues, string, "input" | "select" | "textarea"]
> = [
  ["id", "Mã khách hàng(*)", "input"],
  ["orgUnit", "Đơn vị", "input"],
  ["name", "Tên khách hàng(*)", "input"],
  ["provinceCode", "Mã tỉnh", "select"],
  ["wardCode", "Mã phường xã", "select"],
  ["areaCode", "Mã khu vực", "select"],
  ["permanentAddress", "Địa chỉ thường trú", "textarea"],
  ["currentAddress", "Địa chỉ hiện tại", "textarea"],
  ["mobile", "Số di động", "input"],
  ["fixedPhone", "Số cố định", "input"],
  ["email", "Email", "input"],
  ["taxCode", "Mã số thuế", "input"],
  ["fax", "Fax", "input"],
  ["economicType", "Loại hình kinh tế", "select"],
  ["economicSector", "Ngành kinh tế", "select"],
  ["bankAccount", "Số tài khoản", "input"],
  ["bankName", "Tại ngân hàng", "input"],
]

const personalFields: Array<
  [keyof CustomerFormValues, string, "input" | "select" | "date"]
> = [
  ["gender", "Giới tính", "select"],
  ["dateOfBirth", "Ngày sinh", "date"],
  ["ethnicity", "Dân tộc", "input"],
  ["maritalStatus", "Tình trạng hôn nhân", "input"],
  ["birthPlace", "Nơi sinh", "input"],
  ["occupation", "Nghề nghiệp", "select"],
  ["educationLevel", "Trình độ học vấn", "select"],
  ["cultureLevel", "Trình độ văn hóa", "select"],
  ["identityType", "Loại định danh", "input"],
  ["identityNo", "CCCD/CMND", "input"],
  ["oldIdentityNo", "Số định danh cũ", "input"],
  ["identityIssueDate", "Ngày cấp", "date"],
  ["identityExpiryDate", "Ngày hết hiệu lực", "date"],
  ["identityIssuePlace", "Nơi cấp", "input"],
]

const extendedFields: Array<
  [keyof CustomerFormValues, string, "input" | "select" | "date" | "textarea"]
> = [
  ["segment", "Phân khúc KH", "select"],
  ["riskLevel", "Phân loại rủi ro", "select"],
  ["rank", "Hạng khách hàng", "select"],
  ["memberCardNo", "Số thẻ hội viên", "input"],
  ["memberCardIssueDate", "Ngày cấp thẻ", "date"],
  ["memberCardIssuePlace", "Nơi cấp thẻ", "input"],
  ["extendedOccupation", "Nghề nghiệp", "input"],
  ["jobTitle", "Chức vụ nơi công tác", "input"],
  ["workDuration", "Thời gian công tác", "select"],
  ["laborContractType", "Loại HĐLĐ", "input"],
  ["workplace", "Nơi công tác", "input"],
  ["workplaceAddress", "Địa chỉ công tác", "input"],
  ["note", "Ghi chú", "textarea"],
]

const businessFields: Array<
  [keyof CustomerFormValues, string, "input" | "date"]
> = [
  ["shortName", "Tên tắt doanh nghiệp", "input"],
  ["businessRegistrationNo", "Số đăng ký kinh doanh", "input"],
  ["businessIssueDate", "Ngày cấp", "date"],
  ["issuingAuthority", "Cơ quan ban hành", "input"],
  ["establishedDate", "Ngày thành lập", "date"],
  ["website", "Website", "input"],
  ["representative", "Người đại diện", "input"],
  ["representativeTitle", "Chức vụ nơi công tác", "input"],
  ["representativeIdentityNo", "CCCD/CMND", "input"],
  ["businessLine", "Ngành kinh doanh", "input"],
]

export function CustomersPage({ pathname }: { pathname: string }) {
  const route = routeFromPath(pathname)
  if (route === "profiles")
    return <CustomerTable title="Hồ sơ khách hàng" mode="profiles" />
  if (route === "risk")
    return <CustomerTable title="Khách hàng rủi ro" mode="risk" />
  return <CustomerRegistrationPage initialCustomerId={customerIdFromSearch()} />
}

export function WorkbenchPage({ pathname }: { pathname: string }) {
  const route = workbenchRouteFromPath(pathname)
  if (route === "tasks") return <TaskWorkbenchPage />
  return <DraftWorkbenchPage />
}

function CustomerRegistrationPage({
  initialCustomerId,
}: {
  initialCustomerId?: string | null
}) {
  const [savedCustomer, setSavedCustomer] = useState<Customer | null>(null)
  const saveCustomer = useSaveCustomer()
  const submitCustomer = useSubmitCustomer()
  const uploadAvatar = useUploadCustomerAvatar()
  const customerQuery = useCustomer(initialCustomerId ?? null)
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  })
  const customerType = form.watch("customerType")
  const isPersonal = customerType === "PERSONAL"
  const canAddRelationship = isPersonal && savedCustomer?.status === "APPROVED"

  useEffect(() => {
    if (!customerQuery.data) return
    form.reset(toFormValues(customerQuery.data))
    setSavedCustomer(customerQuery.data)
  }, [customerQuery.data, form])

  async function save(values: CustomerFormValues, submit = false) {
    const saved = await saveCustomer.mutateAsync(toPayload(values))
    setSavedCustomer(saved)
    if (submit) {
      const submitted = await submitCustomer.mutateAsync(saved.id)
      setSavedCustomer(submitted)
    }
  }

  async function uploadAvatarFile(file: File) {
    const customerId = form.getValues("id").trim()
    if (!customerId) {
      notify.error("Nhập Mã khách hàng trước khi upload ảnh đại diện")
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
    const result = await uploadAvatar.mutateAsync({ file, customerId })
    form.setValue("avatarFileId", result.public_id, { shouldDirty: true })
  }

  return (
    <section className="space-y-4">
      <Header
        title="Đăng ký khách hàng"
        description="Nhập thông tin khách hàng hội viên, lưu nháp hoặc trình duyệt theo BPM."
      />
      {customerQuery.isFetching ? (
        <div className="rounded-md border px-4 py-3 text-sm text-muted-foreground">
          Đang tải hồ sơ {initialCustomerId}...
        </div>
      ) : null}
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => save(values))}
      >
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="general">Thông tin khách hàng</TabsTrigger>
            {isPersonal ? (
              <TabsTrigger value="relationships" disabled={!canAddRelationship}>
                Người có liên quan
              </TabsTrigger>
            ) : null}
          </TabsList>
          <TabsContent value="general" className="space-y-4">
            <Panel title="Thông tin chung">
              <div className="grid gap-4 xl:grid-cols-[1fr_220px]">
                <div className="space-y-3">
                  <FormField label="Loại khách hàng">
                    <Controller
                      control={form.control}
                      name="customerType"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(value) =>
                            field.onChange(value as CustomerType)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {selectOptions.customerType.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>
                  <FieldGrid fields={generalFields} form={form} />
                </div>
                <AvatarUploader
                  fileId={form.watch("avatarFileId")}
                  uploading={uploadAvatar.isPending}
                  onClear={() =>
                    form.setValue("avatarFileId", "", { shouldDirty: true })
                  }
                  onUpload={uploadAvatarFile}
                />
              </div>
            </Panel>
            {isPersonal ? (
              <>
                <Panel title="Thông tin định danh">
                  <FieldGrid fields={personalFields} form={form} />
                </Panel>
                <Panel title="Thông tin mở rộng">
                  <FieldGrid fields={extendedFields} form={form} />
                </Panel>
              </>
            ) : (
              <Panel title="Thông tin doanh nghiệp">
                <FieldGrid fields={businessFields} form={form} />
              </Panel>
            )}
          </TabsContent>
          {isPersonal ? (
            <TabsContent value="relationships">
              {savedCustomer ? (
                <RelationshipsPanel customer={savedCustomer} />
              ) : (
                <EmptyState text="Lưu và hoàn thành hồ sơ khách hàng trước khi khai báo người có liên quan." />
              )}
            </TabsContent>
          ) : null}
        </Tabs>
        <div className="flex flex-wrap justify-end gap-2">
          {savedCustomer ? <StatusBadge status={savedCustomer.status} /> : null}
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || saveCustomer.isPending}
          >
            <Save className="size-4" />
            Lưu nháp
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={
              form.formState.isSubmitting ||
              saveCustomer.isPending ||
              submitCustomer.isPending
            }
            onClick={form.handleSubmit((values) => save(values, true))}
          >
            <Send className="size-4" />
            Trình duyệt
          </Button>
        </div>
      </form>
    </section>
  )
}

function DraftWorkbenchPage() {
  return (
    <section className="space-y-4">
      <Header
        title="Hồ sơ nhập"
        description="Danh sách hồ sơ đang soạn hoặc bị trả về bổ sung từ các luồng nghiệp vụ."
      />
      <CustomerDraftList
        onOpen={(customer) =>
          navigateTo(
            `/customers/registrations?customerId=${encodeURIComponent(customer.id)}`
          )
        }
      />
    </section>
  )
}

function TaskWorkbenchPage() {
  return (
    <section className="space-y-4">
      <Header
        title="Việc cần xử lý"
        description="Hàng đợi task BPM dùng chung cho khách hàng, giao dịch đến, giao dịch đi và các luồng về sau."
      />
      <CustomerTaskInbox />
    </section>
  )
}

function FieldGrid({
  fields,
  form,
}: {
  fields: Array<
    [keyof CustomerFormValues, string, "input" | "select" | "textarea" | "date"]
  >
  form: ReturnType<typeof useForm<CustomerFormValues>>
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {fields.map(([name, label, type]) => (
        <FormField
          key={name}
          label={label}
          error={form.formState.errors[name]?.message}
        >
          {type === "select" ? (
            <Controller
              control={form.control}
              name={name}
              render={({ field }) => (
                <Select
                  value={String(field.value || "none")}
                  onValueChange={(value) =>
                    field.onChange(value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {optionsFor(name).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          ) : type === "textarea" ? (
            <Textarea rows={2} {...form.register(name)} />
          ) : (
            <Input
              type={type === "date" ? "date" : "text"}
              {...form.register(name)}
            />
          )}
        </FormField>
      ))}
    </div>
  )
}

function AvatarUploader({
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
            alt="Avatar khách hàng"
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

function CustomerDraftList({
  onOpen,
}: {
  onOpen: (customer: Customer) => void
}) {
  const draftsQuery = useCustomerDrafts()
  const items = draftsQuery.data ?? []

  return (
    <Panel title="Hồ sơ đang xử lý">
      <div className="mb-4 flex justify-end">
        <Button
          type="button"
          variant="secondary"
          disabled={draftsQuery.isFetching}
          onClick={() => void draftsQuery.refetch()}
        >
          Tải lại
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã khách hàng</TableHead>
            <TableHead>Tên khách hàng</TableHead>
            <TableHead>Loai</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Số di động</TableHead>
            <TableHead>CCCD/CMND</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">{item.id}</TableCell>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{customerTypeLabel(item.customerType)}</TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              <TableCell>{item.mobile || "-"}</TableCell>
              <TableCell>{item.identityNo || "-"}</TableCell>
              <TableCell className="text-right">
                <Button type="button" size="sm" onClick={() => onOpen(item)}>
                  Mo
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!items.length ? (
            <EmptyTable colSpan={7} text="Chưa có hồ sơ nhập đang xử lý." />
          ) : null}
        </TableBody>
      </Table>
    </Panel>
  )
}

function CustomerTaskInbox() {
  const [role, setRole] = useState<WorkflowTaskRole>("CUSTOMER_CHECKER")
  const tasksQuery = useWorkflowTasks(role)
  const completeTask = useCompleteWorkflowTask(role)
  const tasks = tasksQuery.data ?? []

  function complete(task: { jobKey: number; processInstanceKey: number; elementId: string }, decision: string) {
    const variables =
      role === "CUSTOMER_RISK_CHECKER"
        ? { riskDecision: decision }
        : role === "CUSTOMER_CHECKER"
          ? { reviewDecision: decision }
          : { reviewDecision: "APPROVE" }
    completeTask.mutate({
      jobKey: task.jobKey,
      processInstanceKey: task.processInstanceKey,
      elementId: task.elementId,
      variables,
    })
  }

  return (
    <Panel title="Việc cần xử lý">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <FormField className="sm:w-72" label="Vai trò xử lý">
          <Select
            value={role}
            onValueChange={(value) => setRole(value as WorkflowTaskRole)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CUSTOMER_CHECKER">Checker</SelectItem>
              <SelectItem value="CUSTOMER_RISK_CHECKER">
                Risk checker
              </SelectItem>
              <SelectItem value="CUSTOMER_MAKER">Maker bổ sung</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <Button
          type="button"
          variant="secondary"
          disabled={tasksQuery.isFetching}
          onClick={() => void tasksQuery.refetch()}
        >
          Lấy task
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Mã hồ sơ</TableHead>
            <TableHead>Mã khách hàng</TableHead>
            <TableHead>Tên khách hàng</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead className="text-right">Xử lý</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.jobKey}>
              <TableCell className="font-mono text-xs">{task.type}</TableCell>
              <TableCell>{task.caseCode || task.caseId || "-"}</TableCell>
              <TableCell className="font-mono text-xs">
                {task.customerId || "-"}
              </TableCell>
              <TableCell>{task.customerName || "-"}</TableCell>
              <TableCell>{task.candidateRole || role}</TableCell>
              <TableCell className="space-x-2 text-right">
                {role !== "CUSTOMER_MAKER" ? (
                  <>
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => complete(task, "APPROVE")}
                    >
                      Duyệt
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => complete(task, "REQUEST_CHANGES")}
                    >
                      Bổ sung
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant="destructive"
                      onClick={() => complete(task, "REJECT")}
                    >
                      Từ chối
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => complete(task, "APPROVE")}
                  >
                    Gửi lại
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!tasks.length ? (
            <EmptyTable colSpan={6} text="Chưa có task nào được lấy." />
          ) : null}
        </TableBody>
      </Table>
    </Panel>
  )
}

function RelationshipsPanel({ customer }: { customer: Customer }) {
  const relationshipsQuery = useCustomerRelationships(customer.id)
  const approvedCustomersQuery = useCustomers({ status: "APPROVED" })
  const createRelationship = useCreateCustomerRelationship(customer.id)
  const candidates = (approvedCustomersQuery.data ?? []).filter(
    (item) => item.id !== customer.id
  )
  const form = useForm<RelationshipFormValues>({
    resolver: zodResolver(relationshipSchema),
    defaultValues: {
      relatedCustomerId: "",
      relationType: "",
      relationCode: "",
      reciprocalRelationCode: "",
      status: "ACTIVE",
    },
  })

  const submit = form.handleSubmit(async (values) => {
    await createRelationship.mutateAsync(values)
    form.reset({
      relatedCustomerId: "",
      relationType: "",
      relationCode: "",
      reciprocalRelationCode: "",
      status: "ACTIVE",
    })
  })

  return (
    <Panel title="Người có liên quan">
      <form
        className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5"
        onSubmit={submit}
      >
        <FormField
          label="Mã khách hàng(*)"
          error={form.formState.errors.relatedCustomerId?.message}
        >
          <Controller
            control={form.control}
            name="relatedCustomerId"
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(value) =>
                  field.onChange(value === "none" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn khách hàng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Chọn khách hàng --</SelectItem>
                  {candidates.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.id} - {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField
          label="Loại quan hệ(*)"
          error={form.formState.errors.relationType?.message}
        >
          <Input {...form.register("relationType")} />
        </FormField>
        <FormField
          label="Mã quan hệ(*)"
          error={form.formState.errors.relationCode?.message}
        >
          <Controller
            control={form.control}
            name="relationCode"
            render={({ field }) => (
              <RelationSelect value={field.value} onChange={field.onChange} />
            )}
          />
        </FormField>
        <FormField
          label="Mã QH đối ứng(*)"
          error={form.formState.errors.reciprocalRelationCode?.message}
        >
          <Controller
            control={form.control}
            name="reciprocalRelationCode"
            render={({ field }) => (
              <RelationSelect value={field.value} onChange={field.onChange} />
            )}
          />
        </FormField>
        <FormField
          label="Trạng thái quan he(*)"
          error={form.formState.errors.status?.message}
        >
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectOptions.status.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <div className="md:col-span-2 xl:col-span-5">
          <Button
            type="submit"
            disabled={createRelationship.isPending || !candidates.length}
          >
            <Plus className="size-4" />
            Thêm mới
          </Button>
        </div>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>TT</TableHead>
            <TableHead>Mã khách hàng</TableHead>
            <TableHead>Tên khách hàng</TableHead>
            <TableHead>Địa chỉ</TableHead>
            <TableHead>Tên quan hệ</TableHead>
            <TableHead>Tên quan hệ đối ứng</TableHead>
            <TableHead>Trạng thái quan he</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(relationshipsQuery.data ?? []).map((item, index) => (
            <TableRow key={item.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell className="font-mono text-xs">
                {item.relatedCustomerId}
              </TableCell>
              <TableCell>{item.relatedCustomerName || "-"}</TableCell>
              <TableCell className="max-w-64 truncate">
                {item.relatedCustomerAddress || "-"}
              </TableCell>
              <TableCell>{relationLabel(item.relationCode)}</TableCell>
              <TableCell>
                {relationLabel(item.reciprocalRelationCode)}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{item.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
          {!relationshipsQuery.data?.length ? (
            <EmptyTable colSpan={7} text="Chưa có quan hệ khách hàng." />
          ) : null}
        </TableBody>
      </Table>
    </Panel>
  )
}

function RelationSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Select
      value={value || "none"}
      onValueChange={(next) => onChange(next === "none" ? "" : next)}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">-- Chọn Mã quan hệ --</SelectItem>
        {selectOptions.relation.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function CustomerTable({
  title,
  mode,
}: {
  title: string
  mode: "profiles" | "risk"
}) {
  const [query, setQuery] = useState("")
  const [submittedQuery, setSubmittedQuery] = useState("")
  const customersQuery = useCustomers({
    q: submittedQuery || undefined,
    riskOnly: mode === "risk",
    status: "APPROVED",
  })
  const items = customersQuery.data ?? []

  return (
    <section className="space-y-4">
      <Header
        title={title}
        description={
          mode === "risk"
            ? "Theo dõi khách hàng có phân loại rủi ro."
            : "Tra cứu hồ sơ khách hàng đã ghi nhận trên CRM."
        }
      />
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault()
          setSubmittedQuery(query.trim())
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo mã, tên, số di động, CCCD/CMND"
          />
        </div>
        <Button type="submit">
          <Search className="size-4" />
          Tìm
        </Button>
      </form>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {mode === "profiles" ? <TableHead>Chọn</TableHead> : null}
              <TableHead>TT</TableHead>
              <TableHead>Mã khách hàng</TableHead>
              <TableHead>Tên khách hàng</TableHead>
              {mode === "profiles" ? (
                <TableHead>Phân khúc khách hàng</TableHead>
              ) : null}
              <TableHead>Loại khách hàng</TableHead>
              {mode === "profiles" ? (
                <TableHead>Hạng khách hàng</TableHead>
              ) : (
                <TableHead>Phân loại rủi ro</TableHead>
              )}
              <TableHead>Số di động</TableHead>
              <TableHead>CCCD/CMND</TableHead>
              <TableHead>Địa chỉ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.id}>
                {mode === "profiles" ? (
                  <TableCell>
                    <input aria-label={`Chọn ${item.id}`} type="checkbox" />
                  </TableCell>
                ) : null}
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-mono text-xs">{item.id}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                {mode === "profiles" ? (
                  <TableCell>{item.segment || "-"}</TableCell>
                ) : null}
                <TableCell>{customerTypeLabel(item.customerType)}</TableCell>
                <TableCell>
                  {mode === "profiles"
                    ? item.rank || "-"
                    : item.riskLevel || "-"}
                </TableCell>
                <TableCell>{item.mobile || "-"}</TableCell>
                <TableCell>{item.identityNo || "-"}</TableCell>
                <TableCell className="max-w-72 truncate">
                  {item.address || "-"}
                </TableCell>
              </TableRow>
            ))}
            {!items.length ? (
              <EmptyTable
                colSpan={mode === "profiles" ? 10 : 8}
                text="Chưa có dữ liệu khách hàng."
              />
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-md border p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Header({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <header className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <FileText className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">{title}</h1>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </header>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "APPROVED" ? "default" : "secondary"
  return <Badge variant={variant}>{status}</Badge>
}

function EmptyTable({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="h-24 text-center text-muted-foreground"
      >
        {text}
      </TableCell>
    </TableRow>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}

function optionsFor(name: keyof CustomerFormValues) {
  if (name === "provinceCode") return selectOptions.province
  if (name === "wardCode") return selectOptions.ward
  if (name === "areaCode") return selectOptions.area
  return selectOptions.generic
}

function toPayload(values: CustomerFormValues) {
  const generalInfo = pick(values, [
    "orgUnit",
    "avatarFileId",
    "provinceCode",
    "wardCode",
    "areaCode",
    "permanentAddress",
    "currentAddress",
    "fixedPhone",
    "taxCode",
    "fax",
    "economicType",
    "economicSector",
    "bankAccount",
    "bankName",
  ])
  const personalInfo =
    values.customerType === "PERSONAL"
      ? pick(values, [
          "gender",
          "dateOfBirth",
          "ethnicity",
          "maritalStatus",
          "birthPlace",
          "occupation",
          "educationLevel",
          "cultureLevel",
          "identityType",
          "identityNo",
          "oldIdentityNo",
          "identityIssueDate",
          "identityExpiryDate",
          "identityIssuePlace",
        ])
      : {}
  const businessInfo =
    values.customerType === "BUSINESS"
      ? pick(values, [
          "shortName",
          "businessRegistrationNo",
          "businessIssueDate",
          "issuingAuthority",
          "establishedDate",
          "website",
          "representative",
          "representativeTitle",
          "representativeIdentityNo",
          "businessLine",
        ])
      : {}
  const extendedInfo =
    values.customerType === "PERSONAL"
      ? pick(values, [
          "memberCardNo",
          "memberCardIssueDate",
          "memberCardIssuePlace",
          "extendedOccupation",
          "jobTitle",
          "workDuration",
          "laborContractType",
          "workplace",
          "workplaceAddress",
          "note",
        ])
      : {}

  return {
    id: values.id.trim(),
    customerType: values.customerType,
    name: values.name.trim(),
    email: values.email.trim(),
    status: "DRAFT" as const,
    mobile: values.mobile.trim(),
    identityNo:
      values.customerType === "PERSONAL"
        ? values.identityNo.trim()
        : values.representativeIdentityNo.trim(),
    address: values.currentAddress.trim() || values.permanentAddress.trim(),
    segment: values.segment.trim(),
    rank: values.rank.trim(),
    riskLevel: values.riskLevel.trim(),
    generalInfo,
    personalInfo,
    businessInfo,
    extendedInfo,
  }
}

function toFormValues(customer: Customer): CustomerFormValues {
  const general = customer.generalInfo
  const personal = customer.personalInfo
  const business = customer.businessInfo
  const extended = customer.extendedInfo
  return {
    ...defaultValues,
    id: customer.id,
    customerType: customer.customerType,
    avatarFileId: stringValue(general.avatarFileId),
    orgUnit: stringValue(general.orgUnit),
    name: customer.name,
    provinceCode: stringValue(general.provinceCode),
    wardCode: stringValue(general.wardCode),
    areaCode: stringValue(general.areaCode),
    permanentAddress: stringValue(general.permanentAddress),
    currentAddress: stringValue(general.currentAddress),
    mobile: customer.mobile,
    fixedPhone: stringValue(general.fixedPhone),
    email: customer.email,
    taxCode: stringValue(general.taxCode),
    fax: stringValue(general.fax),
    economicType: stringValue(general.economicType),
    economicSector: stringValue(general.economicSector),
    bankAccount: stringValue(general.bankAccount),
    bankName: stringValue(general.bankName),
    gender: stringValue(personal.gender) || defaultValues.gender,
    dateOfBirth: stringValue(personal.dateOfBirth),
    ethnicity: stringValue(personal.ethnicity) || defaultValues.ethnicity,
    maritalStatus:
      stringValue(personal.maritalStatus) || defaultValues.maritalStatus,
    birthPlace: stringValue(personal.birthPlace),
    occupation: stringValue(personal.occupation),
    educationLevel: stringValue(personal.educationLevel),
    cultureLevel: stringValue(personal.cultureLevel),
    identityType:
      stringValue(personal.identityType) || defaultValues.identityType,
    identityNo: stringValue(personal.identityNo) || customer.identityNo,
    oldIdentityNo: stringValue(personal.oldIdentityNo),
    identityIssueDate: stringValue(personal.identityIssueDate),
    identityExpiryDate: stringValue(personal.identityExpiryDate),
    identityIssuePlace: stringValue(personal.identityIssuePlace),
    segment: customer.segment,
    riskLevel: customer.riskLevel,
    rank: customer.rank,
    memberCardNo: stringValue(extended.memberCardNo),
    memberCardIssueDate: stringValue(extended.memberCardIssueDate),
    memberCardIssuePlace: stringValue(extended.memberCardIssuePlace),
    extendedOccupation: stringValue(extended.extendedOccupation),
    jobTitle: stringValue(extended.jobTitle),
    workDuration: stringValue(extended.workDuration),
    laborContractType: stringValue(extended.laborContractType),
    workplace: stringValue(extended.workplace),
    workplaceAddress: stringValue(extended.workplaceAddress),
    note: stringValue(extended.note),
    shortName: stringValue(business.shortName),
    businessRegistrationNo: stringValue(business.businessRegistrationNo),
    businessIssueDate: stringValue(business.businessIssueDate),
    issuingAuthority: stringValue(business.issuingAuthority),
    establishedDate: stringValue(business.establishedDate),
    website: stringValue(business.website),
    representative: stringValue(business.representative),
    representativeTitle: stringValue(business.representativeTitle),
    representativeIdentityNo:
      stringValue(business.representativeIdentityNo) || customer.identityNo,
    businessLine: stringValue(business.businessLine),
  }
}

function pick(
  values: CustomerFormValues,
  keys: Array<keyof CustomerFormValues>
) {
  return Object.fromEntries(keys.map((key) => [key, values[key]]))
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : ""
}

function customerTypeLabel(value: CustomerType) {
  return value === "BUSINESS" ? "Doanh nghiệp" : "Cá nhân"
}

function relationLabel(value: string) {
  return (
    selectOptions.relation.find((item) => item.value === value)?.label ?? value
  )
}

function navigateTo(path: string) {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

function customerIdFromSearch() {
  return new URLSearchParams(window.location.search).get("customerId")
}

function routeFromPath(pathname: string): CustomerRoute {
  if (pathname.startsWith("/customers/profiles")) return "profiles"
  if (pathname.startsWith("/customers/risk-cases")) return "risk"
  return "registrations"
}

function workbenchRouteFromPath(pathname: string): WorkbenchRoute {
  if (pathname.startsWith("/workbench/tasks")) return "tasks"
  return "drafts"
}
